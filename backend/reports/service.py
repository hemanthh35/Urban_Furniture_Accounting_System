"""The 3 reports the problem statement asks for. All 3 are pure read-only
aggregations over accounts/journal entries that already exist - nothing here
writes anything, and nothing here needed a single line of new business logic
beyond "add up the right numbers," because the posting engine already guaranteed
every number in the ledger is correct."""

from datetime import date

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from accounts.models import Account
from budgets.models import AnalyticAccount, Budget
from core.errors import AppError
from journals.models import JournalEntry, JournalEntryLine
from reports.schemas import AccountBalance, BalanceSheet, BudgetReport, BudgetReportRow, DashboardSummary, ProductProfitRow, ProfitAndLoss
from payments.models import Payment
from products.models import Product
from purchases.models import PurchaseOrder, VendorBill, VendorBillLine
from sales.models import CustomerInvoice, CustomerInvoiceLine, SalesOrder
from stock.models import StockMovement


def _account_balances(db: Session, account_type: str, from_date: date | None, to_date: date | None) -> list[tuple[Account, int, int]]:
    """Returns (account, total_debit, total_credit) for every account of one type
    that has at least one journal line - accounts nobody's used yet don't clutter
    the report."""
    if from_date and to_date and from_date > to_date:
        raise AppError("INVALID_REPORT_DATES", "From date cannot be after to date", 400)
    query = (
        db.query(
            Account,
            func.coalesce(func.sum(JournalEntryLine.debit_cents), 0),
            func.coalesce(func.sum(JournalEntryLine.credit_cents), 0),
        )
        .join(JournalEntryLine, JournalEntryLine.account_id == Account.id)
        .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
        .filter(Account.type == account_type)
    )
    if from_date:
        query = query.filter(JournalEntry.date >= from_date)
    if to_date:
        query = query.filter(JournalEntry.date <= to_date)
    return query.group_by(Account.id).all()


def balance_sheet(db: Session, from_date: date | None = None, to_date: date | None = None) -> BalanceSheet:
    # Assets are debit-normal (a debit increases them); Liabilities and Capital are
    # credit-normal (a credit increases them) - standard accounting convention.
    assets = [AccountBalance(account_name=a.name, balance_cents=d - c) for a, d, c in _account_balances(db, "Asset", from_date, to_date)]
    liabilities = [AccountBalance(account_name=a.name, balance_cents=c - d) for a, d, c in _account_balances(db, "Liability", from_date, to_date)]
    capital = [AccountBalance(account_name=a.name, balance_cents=c - d) for a, d, c in _account_balances(db, "Capital", from_date, to_date)]

    return BalanceSheet(
        assets=assets,
        liabilities=liabilities,
        capital=capital,
        total_assets_cents=sum(a.balance_cents for a in assets),
        total_liabilities_cents=sum(a.balance_cents for a in liabilities),
        total_capital_cents=sum(a.balance_cents for a in capital),
    )


def _product_profit_breakdown(db: Session, from_date: date | None, to_date: date | None) -> list[ProductProfitRow]:
    """Per-product detail behind the Income/Expense totals above - which products
    actually earned the profit, and which ones ate into it. Revenue and purchase
    spend both exclude tax (same as the Sale Income / Purchase Expense ledger
    accounts they roll up into - tax goes to Tax Payable/Recoverable instead).
    Gross profit here is an estimate: units actually sold this period, valued at
    the product's current master Cost - not the literal purchase price paid for
    those specific units, which the ledger doesn't track per unit."""
    sales_query = (
        db.query(
            CustomerInvoiceLine.product_id,
            func.coalesce(func.sum(CustomerInvoiceLine.quantity), 0),
            func.coalesce(func.sum(CustomerInvoiceLine.quantity * CustomerInvoiceLine.unit_price_cents), 0),
        )
        .join(CustomerInvoice, CustomerInvoice.id == CustomerInvoiceLine.customer_invoice_id)
    )
    if from_date:
        sales_query = sales_query.filter(CustomerInvoice.invoice_date >= from_date)
    if to_date:
        sales_query = sales_query.filter(CustomerInvoice.invoice_date <= to_date)
    sales_by_product = {row[0]: (row[1], row[2]) for row in sales_query.group_by(CustomerInvoiceLine.product_id).all()}

    purchase_query = (
        db.query(
            VendorBillLine.product_id,
            func.coalesce(func.sum(VendorBillLine.quantity), 0),
            func.coalesce(func.sum(VendorBillLine.quantity * VendorBillLine.unit_price_cents), 0),
        )
        .join(VendorBill, VendorBill.id == VendorBillLine.vendor_bill_id)
    )
    if from_date:
        purchase_query = purchase_query.filter(VendorBill.bill_date >= from_date)
    if to_date:
        purchase_query = purchase_query.filter(VendorBill.bill_date <= to_date)
    purchases_by_product = {row[0]: (row[1], row[2]) for row in purchase_query.group_by(VendorBillLine.product_id).all()}

    product_ids = set(sales_by_product) | set(purchases_by_product)
    if not product_ids:
        return []
    products = {p.id: p for p in db.query(Product).filter(Product.id.in_(product_ids)).all()}

    rows = []
    for product_id in product_ids:
        product = products.get(product_id)
        if not product:
            continue
        units_sold, revenue_cents = sales_by_product.get(product_id, (0, 0))
        units_purchased, purchase_spend_cents = purchases_by_product.get(product_id, (0, 0))
        cogs_cents = units_sold * product.cost_cents
        rows.append(ProductProfitRow(
            product_id=product_id,
            product_name=product.name,
            units_sold=units_sold,
            revenue_cents=revenue_cents,
            units_purchased=units_purchased,
            purchase_spend_cents=purchase_spend_cents,
            estimated_cost_of_goods_sold_cents=cogs_cents,
            estimated_gross_profit_cents=revenue_cents - cogs_cents,
        ))
    rows.sort(key=lambda r: r.revenue_cents, reverse=True)
    return rows


def profit_and_loss(db: Session, from_date: date | None = None, to_date: date | None = None) -> ProfitAndLoss:
    # Income is credit-normal, Expenses are debit-normal.
    income = [AccountBalance(account_name=a.name, balance_cents=c - d) for a, d, c in _account_balances(db, "Income", from_date, to_date)]
    expenses = [AccountBalance(account_name=a.name, balance_cents=d - c) for a, d, c in _account_balances(db, "Expense", from_date, to_date)]

    total_income = sum(a.balance_cents for a in income)
    total_expenses = sum(a.balance_cents for a in expenses)

    return ProfitAndLoss(
        income=income,
        expenses=expenses,
        total_income_cents=total_income,
        total_expenses_cents=total_expenses,
        net_profit_cents=total_income - total_expenses,
        by_product=_product_profit_breakdown(db, from_date, to_date),
    )


def budget_report(db: Session, from_date: date | None = None, to_date: date | None = None) -> BudgetReport:
    """Show planned amounts beside actual tagged journal activity."""
    if from_date and to_date and from_date > to_date:
        raise AppError("INVALID_REPORT_DATES", "From date cannot be after to date", 400)
    query = db.query(Budget, AnalyticAccount).join(AnalyticAccount, Budget.analytic_account_id == AnalyticAccount.id).filter(Budget.is_archived.is_(False))
    if from_date:
        query = query.filter(or_(Budget.end_date.is_(None), Budget.end_date >= from_date))
    if to_date:
        query = query.filter(or_(Budget.start_date.is_(None), Budget.start_date <= to_date))
    rows = query.all()
    report_rows = []
    for b, aa in rows:
        actual_query = (
            db.query(func.coalesce(func.sum(JournalEntryLine.credit_cents - JournalEntryLine.debit_cents), 0))
            .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
            .join(Account, Account.id == JournalEntryLine.account_id)
            .filter(JournalEntryLine.analytic_account_id == aa.id)
        )
        if aa.type == "Expenses":
            actual_query = (
                db.query(func.coalesce(func.sum(JournalEntryLine.debit_cents - JournalEntryLine.credit_cents), 0))
                .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
                .join(Account, Account.id == JournalEntryLine.account_id)
                .filter(JournalEntryLine.analytic_account_id == aa.id, Account.type == "Expense")
            )
        else:
            actual_query = actual_query.filter(Account.type == "Income")
        if from_date:
            actual_query = actual_query.filter(JournalEntry.date >= from_date)
        if to_date:
            actual_query = actual_query.filter(JournalEntry.date <= to_date)
        actual = actual_query.scalar() or 0
        report_rows.append(BudgetReportRow(
            budget_name=b.name,
            period=b.period,
            analytic_account_name=aa.name,
            planned_amount_cents=b.planned_amount_cents,
            actual_amount_cents=actual,
            remaining_amount_cents=b.planned_amount_cents - actual,
        ))
    return BudgetReport(
        rows=report_rows
    )


def dashboard_summary(db: Session) -> DashboardSummary:
    invoices = db.query(CustomerInvoice).all()
    bills = db.query(VendorBill).all()
    invoice_paid = {invoice.id: 0 for invoice in invoices}
    bill_paid = {bill.id: 0 for bill in bills}
    for payment in db.query(Payment).all():
        if payment.customer_invoice_id in invoice_paid:
            invoice_paid[payment.customer_invoice_id] += payment.amount_cents
        if payment.vendor_bill_id in bill_paid:
            bill_paid[payment.vendor_bill_id] += payment.amount_cents
    stock_total = sum((movement.quantity_delta for movement in db.query(StockMovement).all()), 0)
    products_in_stock = 0
    for product in db.query(Product).filter(Product.is_archived.is_(False)).all():
        quantity = sum(m.quantity_delta for m in db.query(StockMovement).filter(StockMovement.product_id == product.id).all())
        products_in_stock += 1 if quantity > 0 else 0
    pnl = profit_and_loss(db)
    bs = balance_sheet(db)
    budget_rows = budget_report(db).rows
    top_expense = max(pnl.expenses, key=lambda a: a.balance_cents, default=None)
    top_income = max(pnl.income, key=lambda a: a.balance_cents, default=None)
    return DashboardSummary(
        total_assets_cents=bs.total_assets_cents,
        total_liabilities_cents=bs.total_liabilities_cents,
        total_capital_cents=bs.total_capital_cents,
        total_income_cents=pnl.total_income_cents,
        total_expenses_cents=pnl.total_expenses_cents,
        top_expense_account=top_expense.account_name if top_expense else None,
        top_expense_cents=top_expense.balance_cents if top_expense else 0,
        top_income_account=top_income.account_name if top_income else None,
        top_income_cents=top_income.balance_cents if top_income else 0,
        net_profit_cents=pnl.net_profit_cents,
        outstanding_invoices_cents=sum(max(invoice.amount_cents - invoice_paid[invoice.id], 0) for invoice in invoices),
        outstanding_bills_cents=sum(max(bill.amount_cents - bill_paid[bill.id], 0) for bill in bills),
        products_in_stock=products_in_stock,
        units_in_stock=stock_total,
        budget_planned_cents=sum(row.planned_amount_cents for row in budget_rows),
        budget_actual_cents=sum(row.actual_amount_cents for row in budget_rows),
        # "Draft" = still needs action (convert to a Bill/Invoice) - the number
        # that actually matters on a dashboard shortcut, not the total ever created.
        draft_purchase_orders=db.query(PurchaseOrder).filter(PurchaseOrder.status == "draft").count(),
        draft_sales_orders=db.query(SalesOrder).filter(SalesOrder.status == "draft").count(),
    )
