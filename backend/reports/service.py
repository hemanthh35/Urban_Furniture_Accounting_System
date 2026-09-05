"""The 3 reports the problem statement asks for. All 3 are pure read-only
aggregations over accounts/journal entries that already exist - nothing here
writes anything, and nothing here needed a single line of new business logic
beyond "add up the right numbers," because the posting engine already guaranteed
every number in the ledger is correct."""

from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from accounts.models import Account
from budgets.models import AnalyticAccount, Budget
from journals.models import JournalEntry, JournalEntryLine
from reports.schemas import AccountBalance, BalanceSheet, BudgetReport, BudgetReportRow, ProfitAndLoss


def _account_balances(db: Session, account_type: str, from_date: date | None, to_date: date | None) -> list[tuple[Account, int, int]]:
    """Returns (account, total_debit, total_credit) for every account of one type
    that has at least one journal line - accounts nobody's used yet don't clutter
    the report."""
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
    )


def budget_report(db: Session, from_date: date | None = None, to_date: date | None = None) -> BudgetReport:
    """Problem statement: 'Budget Report - Provides an overview of the planned
    budget.' Just a listing, not a planned-vs-actual comparison - the spec never
    asks transactions to be tagged with an analytic account, so there's no 'actual
    spend per analytic account' to compare against."""
    # Budget periods are labels such as 2026-Q1, so date filters do not apply
    # until budgets have real start/end dates. Keep the endpoint consistent.
    rows = db.query(Budget, AnalyticAccount).join(AnalyticAccount, Budget.analytic_account_id == AnalyticAccount.id).all()
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
        ))
    return BudgetReport(
        rows=report_rows
    )
