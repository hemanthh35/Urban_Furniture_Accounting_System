from sqlalchemy.orm import Session

from accounts.models import Account
from accounts.schemas import AccountCreate


def list_accounts(db: Session) -> list[Account]:
    return db.query(Account).all()


def create_account(db: Session, payload: AccountCreate) -> Account:
    account = Account(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
