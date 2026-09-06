from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from journals import service
from journals.schemas import JournalCreate, JournalEntryOut, JournalOut, OpeningBalanceCreate

router = APIRouter(prefix="/journals", tags=["journals"])

CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")


@router.get("", response_model=list[JournalOut])
def list_journals(include_archived: bool = False, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_journals(db, include_archived)


@router.post("", response_model=JournalOut)
def create_journal(payload: JournalCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_journal(db, payload)


@router.put("/{journal_id}", response_model=JournalOut)
def update_journal(journal_id: int, payload: JournalCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.update_journal(db, journal_id, payload)


@router.post("/{journal_id}/archive", status_code=204)
def archive_journal(journal_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.archive_journal(db, journal_id)


@router.post("/{journal_id}/restore", status_code=204)
def restore_journal(journal_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.restore_journal(db, journal_id)


@router.post("/opening-balance", response_model=JournalEntryOut)
def create_opening_balance(payload: OpeningBalanceCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_opening_balance(db, payload.date, payload.cash_cents, payload.bank_cents)


@router.get("/entries", response_model=list[JournalEntryOut])
def list_entries(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_entries(db)


@router.get("/entries/{entry_id}", response_model=JournalEntryOut)
def get_entry(entry_id: int, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.get_entry(db, entry_id)
