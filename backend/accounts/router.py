from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from accounts import service
from accounts.schemas import AccountCreate, AccountOut, AccountUpdate
from core.database import get_db
from core.security import require_roles

router = APIRouter(prefix="/accounts", tags=["accounts"])

CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_accounts(db)


@router.post("", response_model=AccountOut)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_account(db, payload)


@router.put("/{account_id}", response_model=AccountOut)
def update_account(account_id: int, payload: AccountUpdate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.update_account(db, account_id, payload)


@router.post("/{account_id}/archive", status_code=204)
def archive_account(account_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.archive_account(db, account_id)
