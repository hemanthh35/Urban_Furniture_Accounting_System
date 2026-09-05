from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from journals import service
from journals.schemas import JournalCreate, JournalEntryOut, JournalOut

router = APIRouter(prefix="/journals", tags=["journals"])

CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")


@router.get("", response_model=list[JournalOut])
def list_journals(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_journals(db)


@router.post("", response_model=JournalOut)
def create_journal(payload: JournalCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_journal(db, payload)


@router.get("/entries", response_model=list[JournalEntryOut])
def list_entries(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_entries(db)


@router.get("/entries/{entry_id}", response_model=JournalEntryOut)
def get_entry(entry_id: int, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.get_entry(db, entry_id)
