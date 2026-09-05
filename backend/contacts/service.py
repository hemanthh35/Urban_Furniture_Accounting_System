"""Contact CRUD - the simplest module, good template for how every other module's
service.py looks: plain functions, no magic, one job each."""

from sqlalchemy.orm import Session

from auth.models import User
from contacts.models import Contact
from contacts.schemas import ContactCreate, ContactUpdate
from core.errors import AppError
from core.security import hash_password


def list_contacts(db: Session, include_archived: bool = False) -> list[Contact]:
    query = db.query(Contact)
    if not include_archived:
        query = query.filter(Contact.is_archived.is_(False))
    return query.all()


def get_contact(db: Session, contact_id: int) -> Contact:
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise AppError("CONTACT_NOT_FOUND", f"Contact {contact_id} does not exist", 404)
    return contact


def _create_portal_login(db: Session, contact: Contact, email: str | None, password: str) -> None:
    if len(password) < 8:
        raise AppError("WEAK_PASSWORD", "Portal password must be at least 8 characters", 400)
    if not email:
        raise AppError("EMAIL_REQUIRED", "A contact needs an email to also get a login", 400)
    if db.query(User).filter(User.email == email).first():
        raise AppError("EMAIL_TAKEN", "An account with that email already exists", 409)
    db.add(User(email=email, password_hash=hash_password(password), role="contact", contact_id=contact.id))


def has_portal_login(db: Session, contact_id: int) -> bool:
    return db.query(User).filter(User.contact_id == contact_id).first() is not None


def create_contact(db: Session, payload: ContactCreate) -> Contact:
    if payload.type not in ("Customer", "Vendor", "Both"):
        raise AppError("INVALID_CONTACT_TYPE", "Contact type must be Customer, Vendor, or Both", 400)
    data = payload.model_dump(exclude={"create_login_password"})
    contact = Contact(**data)
    db.add(contact)
    db.flush()  # need contact.id before linking a User to it

    # "Contact users can be created when creating Contact Master data" - only
    # happens if a password was actually given, since a Contact doesn't need a
    # login by default (e.g. a vendor you never give portal access to).
    if payload.create_login_password:
        _create_portal_login(db, contact, payload.email, payload.create_login_password)

    db.commit()
    db.refresh(contact)
    return contact


def grant_portal_access(db: Session, contact_id: int, password: str) -> None:
    """Same login-creation path as create_contact's create_login_password, for a
    contact that already exists - covers the very normal case of 'we added this
    customer months ago, now let's give them portal access'."""
    contact = get_contact(db, contact_id)
    if has_portal_login(db, contact_id):
        raise AppError("ALREADY_HAS_LOGIN", "This contact already has portal access", 409)
    _create_portal_login(db, contact, contact.email, password)
    db.commit()


def reset_portal_password(db: Session, contact_id: int, new_password: str) -> None:
    """Admin-side reset - unlike auth.service.change_password, doesn't need the
    contact's current password, since the whole point is they can't log in to
    provide one (forgot it, never got it, etc)."""
    if len(new_password) < 8:
        raise AppError("WEAK_PASSWORD", "Portal password must be at least 8 characters", 400)
    user = db.query(User).filter(User.contact_id == contact_id).first()
    if not user:
        raise AppError("NO_PORTAL_LOGIN", "This contact does not have portal access yet", 404)
    user.password_hash = hash_password(new_password)
    db.commit()


def update_contact(db: Session, contact_id: int, payload: ContactUpdate) -> Contact:
    if payload.type not in ("Customer", "Vendor", "Both"):
        raise AppError("INVALID_CONTACT_TYPE", "Contact type must be Customer, Vendor, or Both", 400)
    contact = get_contact(db, contact_id)
    for field, value in payload.model_dump().items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


def archive_contact(db: Session, contact_id: int) -> None:
    contact = get_contact(db, contact_id)
    contact.is_archived = True
    db.commit()


def restore_contact(db: Session, contact_id: int) -> None:
    contact = get_contact(db, contact_id)
    contact.is_archived = False
    db.commit()
