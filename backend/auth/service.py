from sqlalchemy.orm import Session

from auth.models import User
from auth.schemas import ChangePasswordRequest, LoginRequest, SignupRequest
from core.errors import AppError
from core.security import create_access_token, hash_password, verify_password


def signup(db: Session, payload: SignupRequest) -> User:
    if len(payload.password) < 8:
        raise AppError("WEAK_PASSWORD", "Password must be at least 8 characters", 400)
    if payload.role != "accountant":
        raise AppError("INVALID_ROLE", "Public signup is only for accountant accounts", 400)
    if db.query(User).filter(User.email == payload.email).first():
        raise AppError("EMAIL_TAKEN", "An account with that email already exists", 409)

    user = User(email=payload.email, password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, payload: LoginRequest) -> tuple[str, str]:
    user = db.query(User).filter(User.email == payload.email, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise AppError("INVALID_CREDENTIALS", "Wrong email or password", 401)
    token = create_access_token(user.id, user.role)
    return token, user.role


def change_password(db: Session, user_id: int, payload: ChangePasswordRequest) -> None:
    if len(payload.new_password) < 8:
        raise AppError("WEAK_PASSWORD", "New password must be at least 8 characters", 400)
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.current_password, user.password_hash):
        raise AppError("INVALID_PASSWORD", "Current password is incorrect", 400)
    user.password_hash = hash_password(payload.new_password)
    db.commit()


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.email).all()


def set_user_active(db: Session, user_id: int, active: bool, current_user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AppError("USER_NOT_FOUND", "That user does not exist", 404)
    if user.id == current_user_id and not active:
        raise AppError("CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account", 400)
    user.is_active = active
    db.commit()
    db.refresh(user)
    return user
