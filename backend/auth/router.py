from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import service
from auth.schemas import AdminUserCreate, ChangePasswordRequest, LoginRequest, SignupRequest, TokenResponse, UserOut
from core.database import get_db
from core.security import CurrentUser, require_roles

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    service.signup(db, payload)
    token, role = service.login(db, LoginRequest(login_id=payload.login_id, password=payload.password))
    return TokenResponse(access_token=token, role=role)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    token, role = service.login(db, payload)
    return TokenResponse(access_token=token, role=role)


@router.post("/change-password", status_code=204)
def change_password(payload: ChangePasswordRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("admin", "accountant", "contact"))):
    service.change_password(db, user.id, payload)


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    return service.list_users(db)


@router.post("/users", response_model=UserOut)
def create_user(payload: AdminUserCreate, db: Session = Depends(get_db), _user=Depends(require_roles("admin"))):
    return service.create_user(db, payload)


@router.post("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("admin"))):
    return service.set_user_active(db, user_id, False, user.id)


@router.post("/users/{user_id}/activate", response_model=UserOut)
def activate_user(user_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("admin"))):
    return service.set_user_active(db, user_id, True, user.id)
