from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from contacts import service
from contacts.schemas import ContactCreate, ContactOut, ContactUpdate
from core.database import get_db
from core.security import require_roles

router = APIRouter(prefix="/contacts", tags=["contacts"])

# Only admin and accountant manage contacts - a "contact" role user IS a contact,
# they don't manage the list of contacts.
CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")


@router.get("", response_model=list[ContactOut])
def list_contacts(include_archived: bool = False, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_contacts(db, include_archived)


@router.post("", response_model=ContactOut)
def create_contact(payload: ContactCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_contact(db, payload)


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: int, payload: ContactUpdate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.update_contact(db, contact_id, payload)


@router.post("/{contact_id}/archive", status_code=204)
def archive_contact(contact_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.archive_contact(db, contact_id)


@router.post("/{contact_id}/restore", status_code=204)
def restore_contact(contact_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.restore_contact(db, contact_id)
