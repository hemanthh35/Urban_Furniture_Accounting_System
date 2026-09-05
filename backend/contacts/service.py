"""Contact CRUD - the simplest module, good template for how every other module's
service.py looks: plain functions, no magic, one job each."""

from sqlalchemy.orm import Session

from auth.models import User
from contacts.models import Contact
from contacts.schemas import ContactCreate
from core.errors import AppError
from core.security import hash_password


def list_contacts(db: Session) -> list[Contact]:
    return db.query(Contact).all()


def get_contact(db: Session, contact_id: int) -> Contact:
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise AppError("CONTACT_NOT_FOUND", f"Contact {contact_id} does not exist", 404)
    return contact


def create_contact(db: Session, payload: ContactCreate) -> Contact:
    data = payload.model_dump(exclude={"create_login_password"})
    contact = Contact(**data)
    db.add(contact)
    db.flush()  # need contact.id before linking a User to it

    # "Contact users can be created when creating Contact Master data" - only
    # happens if a password was actually given, since a Contact doesn't need a
    # login by default (e.g. a vendor you never give portal access to).
    if payload.create_login_password:
        if not payload.email:
            raise AppError("EMAIL_REQUIRED", "A contact needs an email to also get a login", 400)
        if db.query(User).filter(User.email == payload.email).first():
            raise AppError("EMAIL_TAKEN", "An account with that email already exists", 409)
        db.add(User(email=payload.email, password_hash=hash_password(payload.create_login_password), role="contact", contact_id=contact.id))

    db.commit()
    db.refresh(contact)
    return contact
