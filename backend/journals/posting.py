"""The accounting engine: exactly 4 fixed rules, one per transaction type, taken
directly from the problem statement's own examples ('Cash received from customer ->
Debit: Cash, Credit: Debtor' and 'Purchase made on credit -> Debit: Purchase
Expense, Credit: Creditor') plus their natural mirror pairs for invoices and vendor
payments. Nothing here is configurable or general-purpose - hardcoding these 4
removes any risk of getting debit/credit backwards. Every function does the same
3 things: find the 2 real accounts involved, create one JournalEntry, add 2
balanced lines (so debits always equal credits - the whole point of double-entry)."""

from datetime import date

from sqlalchemy.orm import Session

from accounts.models import Account
from core.errors import AppError
from journals.models import Journal, JournalEntry, JournalEntryLine


def _get_account(db: Session, name: str) -> Account:
    account = db.query(Account).filter(Account.name == name, Account.is_archived.is_(False)).first()
    if not account:
        raise AppError("ACCOUNT_NOT_FOUND", f"Chart of Accounts is missing a required account: '{name}'", 500)
    return account


def _get_or_create_journal(db: Session, journal_type: str) -> Journal:
    journal = db.query(Journal).filter(Journal.type == journal_type, Journal.is_archived.is_(False)).first()
    if not journal:
        journal = Journal(name=f"{journal_type} Journal", type=journal_type)
        db.add(journal)
        db.flush()
    return journal


def _post(
    db: Session, journal_type: str, entry_date: date, reference: str,
    debit_account: str, credit_account: str, amount_cents: int, analytic_account_id: int | None = None,
) -> JournalEntry:
    journal = _get_or_create_journal(db, journal_type)
    debit = _get_account(db, debit_account)
    credit = _get_account(db, credit_account)

    entry = JournalEntry(journal_id=journal.id, date=entry_date, reference=reference)
    db.add(entry)
    db.flush()  # need entry.id before writing its lines

    db.add(JournalEntryLine(journal_entry_id=entry.id, account_id=debit.id, analytic_account_id=analytic_account_id, debit_cents=amount_cents, credit_cents=0))
    db.add(JournalEntryLine(journal_entry_id=entry.id, account_id=credit.id, analytic_account_id=analytic_account_id, debit_cents=0, credit_cents=amount_cents))
    db.flush()
    return entry


def _post_lines(db: Session, journal_type: str, entry_date: date, reference: str, lines: list[tuple[str, int, int]], analytic_account_id: int | None = None) -> JournalEntry:
    journal = _get_or_create_journal(db, journal_type)
    entry = JournalEntry(journal_id=journal.id, date=entry_date, reference=reference)
    db.add(entry)
    db.flush()
    for account_name, debit_cents, credit_cents in lines:
        account = _get_account(db, account_name)
        db.add(JournalEntryLine(
            journal_entry_id=entry.id,
            account_id=account.id,
            analytic_account_id=analytic_account_id,
            debit_cents=debit_cents,
            credit_cents=credit_cents,
        ))
    db.flush()
    return entry


def post_vendor_bill(db: Session, bill_date: date, reference: str, amount_cents: int, analytic_account_id: int | None = None, subtotal_cents: int | None = None, tax_cents: int = 0) -> JournalEntry:
    """Problem statement's own example: 'Purchase made on credit -> Debit: Purchase
    Expense, Credit: Creditor'."""
    if tax_cents:
        return _post_lines(db, "Purchase", bill_date, reference, [
            ("Purchase Expense", subtotal_cents or amount_cents, 0),
            ("Tax Recoverable", tax_cents, 0),
            ("Creditors", 0, amount_cents),
        ], analytic_account_id)
    return _post(db, "Purchase", bill_date, reference, "Purchase Expense", "Creditors", amount_cents, analytic_account_id)


def post_customer_invoice(db: Session, invoice_date: date, reference: str, amount_cents: int, analytic_account_id: int | None = None, subtotal_cents: int | None = None, tax_cents: int = 0) -> JournalEntry:
    """Mirror of the vendor bill rule for the sales side: raising an invoice means
    the customer now owes us money (Debtors up) and we've earned income."""
    if tax_cents:
        return _post_lines(db, "Sales", invoice_date, reference, [
            ("Debtors", amount_cents, 0),
            ("Sale Income", 0, subtotal_cents or amount_cents),
            ("Tax Payable", 0, tax_cents),
        ], analytic_account_id)
    return _post(db, "Sales", invoice_date, reference, "Debtors", "Sale Income", amount_cents, analytic_account_id)


def post_customer_payment(db: Session, payment_date: date, reference: str, amount_cents: int, method: str) -> JournalEntry:
    """Problem statement's own example: 'Cash received from customer -> Debit:
    Cash, Credit: Debtor'. Same rule for Bank - method is used directly as the
    account name, so the Chart of Accounts must have accounts literally named
    'Cash' and 'Bank' (matching the problem statement's own example CoA)."""
    journal_type = "Cash" if method == "Cash" else "Bank"
    return _post(db, journal_type, payment_date, reference, method, "Debtors", amount_cents)


def post_vendor_payment(db: Session, payment_date: date, reference: str, amount_cents: int, method: str) -> JournalEntry:
    """Mirror of the customer payment rule: paying a vendor reduces what we owe
    them (Creditors debited down) and reduces our Cash/Bank balance."""
    journal_type = "Cash" if method == "Cash" else "Bank"
    return _post(db, journal_type, payment_date, reference, "Creditors", method, amount_cents)


def post_opening_balance(db: Session, entry_date: date, cash_cents: int = 0, bank_cents: int = 0) -> JournalEntry:
    """One-time entry for whatever was already in Cash/Bank before this system
    started tracking anything - Debit Cash/Bank, Credit Capital (the owner's own
    stake that funded that starting balance). Without this, a fresh set of books
    starts every account at exactly 0, so any real activity that happened before
    the first logged transaction shows up as a false negative balance instead."""
    lines = []
    if cash_cents:
        lines.append(("Cash", cash_cents, 0))
    if bank_cents:
        lines.append(("Bank", bank_cents, 0))
    if not lines:
        raise AppError("EMPTY_OPENING_BALANCE", "Enter a Cash and/or Bank opening balance greater than zero", 400)
    lines.append(("Capital", 0, cash_cents + bank_cents))
    return _post_lines(db, "Opening Balance", entry_date, "Opening Balance", lines)
