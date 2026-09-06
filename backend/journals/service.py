from datetime import date

from sqlalchemy.orm import Session

from accounts.models import Account
from core.errors import AppError
from journals.models import Journal, JournalEntry
from journals.posting import post_opening_balance
from journals.schemas import JournalCreate


def list_journals(db: Session, include_archived: bool = False) -> list[Journal]:
    query = db.query(Journal)
    if not include_archived:
        query = query.filter(Journal.is_archived.is_(False))
    return query.order_by(Journal.name).all()


def create_journal(db: Session, payload: JournalCreate) -> Journal:
    if payload.type not in ("Sales", "Purchase", "Bank", "Cash"):
        raise AppError("INVALID_JOURNAL_TYPE", "Journal type is invalid", 400)
    if payload.default_account_id is not None:
        account = db.query(Account).filter(Account.id == payload.default_account_id, Account.is_archived.is_(False)).first()
        if not account:
            raise AppError("ACCOUNT_NOT_FOUND", "That default account does not exist", 404)
    journal = Journal(**payload.model_dump())
    db.add(journal)
    db.commit()
    db.refresh(journal)
    return journal


def update_journal(db: Session, journal_id: int, payload: JournalCreate) -> Journal:
    if payload.type not in ("Sales", "Purchase", "Bank", "Cash"):
        raise AppError("INVALID_JOURNAL_TYPE", "Journal type is invalid", 400)
    journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not journal:
        raise AppError("JOURNAL_NOT_FOUND", "That journal does not exist", 404)
    if payload.default_account_id is not None and not db.query(Account).filter(Account.id == payload.default_account_id, Account.is_archived.is_(False)).first():
        raise AppError("ACCOUNT_NOT_FOUND", "That default account does not exist", 404)
    for field, value in payload.model_dump().items():
        setattr(journal, field, value)
    db.commit()
    db.refresh(journal)
    return journal


def archive_journal(db: Session, journal_id: int) -> None:
    journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not journal:
        raise AppError("JOURNAL_NOT_FOUND", "That journal does not exist", 404)
    journal.is_archived = True
    db.commit()


def restore_journal(db: Session, journal_id: int) -> None:
    journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not journal:
        raise AppError("JOURNAL_NOT_FOUND", "That journal does not exist", 404)
    journal.is_archived = False
    db.commit()


def list_entries(db: Session) -> list[dict]:
    entries = db.query(JournalEntry).order_by(JournalEntry.date.desc(), JournalEntry.id.desc()).all()
    return [_entry_dict(db, entry) for entry in entries]


def get_entry(db: Session, entry_id: int) -> dict:
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise AppError("JOURNAL_ENTRY_NOT_FOUND", "That journal entry does not exist", 404)
    return _entry_dict(db, entry)


def create_opening_balance(db: Session, entry_date: date, cash_cents: int, bank_cents: int) -> dict:
    if not db.query(Account).filter(Account.name == "Capital", Account.is_archived.is_(False)).first():
        raise AppError("CAPITAL_ACCOUNT_MISSING", "Create a 'Capital' account (type Capital) in Chart of Accounts first", 400)
    if db.query(JournalEntry).join(Journal).filter(Journal.type == "Opening Balance").first():
        raise AppError("OPENING_BALANCE_ALREADY_SET", "An opening balance has already been recorded - this is meant to run once", 409)
    entry = post_opening_balance(db, entry_date, cash_cents, bank_cents)
    db.commit()
    return _entry_dict(db, entry)


def _entry_dict(db: Session, entry: JournalEntry) -> dict:
    journal = db.query(Journal).filter(Journal.id == entry.journal_id).first()
    lines = []
    for line in entry.lines:
        account = db.query(Account).filter(Account.id == line.account_id).first()
        lines.append({
            "id": line.id,
            "account_id": line.account_id,
            "account_name": account.name if account else "Unknown account",
            "debit_cents": line.debit_cents,
            "credit_cents": line.credit_cents,
        })
    return {
        "id": entry.id,
        "journal_id": entry.journal_id,
        "journal_name": journal.name if journal else "Unknown journal",
        "date": entry.date,
        "reference": entry.reference,
        "lines": lines,
    }
