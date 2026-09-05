from sqlalchemy.orm import Session

from accounts.models import Account
from accounts.schemas import AccountCreate, AccountUpdate
from core.errors import AppError


def list_accounts(db: Session) -> list[Account]:
    return db.query(Account).filter(Account.is_archived.is_(False)).all()


def create_account(db: Session, payload: AccountCreate) -> Account:
    account = Account(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(db: Session, account_id: int, payload: AccountUpdate) -> Account:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise AppError("ACCOUNT_NOT_FOUND", f"Account {account_id} does not exist", 404)
    for field, value in payload.model_dump().items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


def archive_account(db: Session, account_id: int) -> None:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise AppError("ACCOUNT_NOT_FOUND", f"Account {account_id} does not exist", 404)
    account.is_archived = True
    db.commit()
