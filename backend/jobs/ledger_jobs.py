"""Double-entry bookkeeping's core promise is that total debits always equal
total credits, across every entry ever posted - not just the one just made.
This job re-checks that across the entire ledger, so we can prove the books
are still balanced without a human eyeballing every row."""

from sqlalchemy import func

from core.database import SessionLocal
from journals.models import JournalEntry, JournalEntryLine


def run_ledger_integrity_check() -> dict:
    db = SessionLocal()
    try:
        total_debit, total_credit = db.query(
            func.coalesce(func.sum(JournalEntryLine.debit_cents), 0),
            func.coalesce(func.sum(JournalEntryLine.credit_cents), 0),
        ).first()

        unbalanced_entries = []
        entries = db.query(JournalEntry).all()
        for entry in entries:
            debit = sum(line.debit_cents for line in entry.lines)
            credit = sum(line.credit_cents for line in entry.lines)
            if debit != credit:
                unbalanced_entries.append({
                    "journal_entry_id": entry.id,
                    "reference": entry.reference,
                    "debit_cents": debit,
                    "credit_cents": credit,
                })

        return {
            "total_entries_checked": len(entries),
            "total_debit_cents": total_debit,
            "total_credit_cents": total_credit,
            "balanced": total_debit == total_credit and not unbalanced_entries,
            "unbalanced_entries": unbalanced_entries,
        }
    finally:
        db.close()
