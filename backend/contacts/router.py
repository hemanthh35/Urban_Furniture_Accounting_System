from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from contacts import service
from contacts.schemas import ContactCreate, ContactOut, ContactUpdate, GrantPortalAccess
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


@router.get("/{contact_id}/portal-status")
def get_portal_status(contact_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return {"has_login": service.has_portal_login(db, contact_id)}


@router.post("/{contact_id}/grant-portal-access", status_code=204)
def grant_portal_access(contact_id: int, payload: GrantPortalAccess, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.grant_portal_access(db, contact_id, payload.password)


@router.post("/{contact_id}/reset-portal-password", status_code=204)
def reset_portal_password(contact_id: int, payload: GrantPortalAccess, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.reset_portal_password(db, contact_id, payload.password)
