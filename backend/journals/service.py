from sqlalchemy.orm import Session

from accounts.models import Account
from core.errors import AppError
from journals.models import Journal, JournalEntry
from journals.schemas import JournalCreate


def list_journals(db: Session) -> list[Journal]:
    return db.query(Journal).order_by(Journal.name).all()


def create_journal(db: Session, payload: JournalCreate) -> Journal:
    if payload.default_account_id is not None:
        account = db.query(Account).filter(Account.id == payload.default_account_id).first()
        if not account:
            raise AppError("ACCOUNT_NOT_FOUND", "That default account does not exist", 404)
    journal = Journal(**payload.model_dump())
    db.add(journal)
    db.commit()
    db.refresh(journal)
    return journal


def list_entries(db: Session) -> list[dict]:
    entries = db.query(JournalEntry).order_by(JournalEntry.date.desc(), JournalEntry.id.desc()).all()
    return [_entry_dict(db, entry) for entry in entries]


def get_entry(db: Session, entry_id: int) -> dict:
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise AppError("JOURNAL_ENTRY_NOT_FOUND", "That journal entry does not exist", 404)
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
