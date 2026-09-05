from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth.models import User
from auth.schemas import AdminUserCreate, ChangePasswordRequest, LoginRequest, SignupRequest
from core.errors import AppError
from core.security import create_access_token, hash_password, verify_password


def signup(db: Session, payload: SignupRequest) -> User:
    if len(payload.login_id) < 6 or len(payload.login_id) > 12:
        raise AppError("INVALID_LOGIN_ID", "Login ID must be between 6 and 12 characters", 400)
    if payload.password_confirmation is not None and payload.password != payload.password_confirmation:
        raise AppError("PASSWORD_MISMATCH", "Passwords do not match", 400)
    if len(payload.password) < 8 or not any(c.islower() for c in payload.password) or not any(c.isupper() for c in payload.password) or not any(c.isdigit() for c in payload.password) or not any(not c.isalnum() for c in payload.password):
        raise AppError("WEAK_PASSWORD", "Password must contain upper, lower, number, special character, and be at least 8 characters", 400)
    if not payload.name.strip():
        raise AppError("NAME_REQUIRED", "Name is required", 400)
    if payload.role not in ("user", "accountant"):
        raise AppError("INVALID_ROLE", "Public signup is only for User accounts", 400)
    if db.query(User).filter(or_(User.email == payload.email, User.login_id == payload.login_id)).first():
        raise AppError("EMAIL_TAKEN", "An account with that email already exists", 409)

    user = User(name=payload.name.strip(), login_id=payload.login_id, email=payload.email, password_hash=hash_password(payload.password), role="accountant")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, payload: LoginRequest) -> tuple[str, str]:
    identifier = payload.login_id or payload.email
    if not identifier:
        raise AppError("LOGIN_ID_REQUIRED", "Enter a Login ID or email", 400)
    user = db.query(User).filter(or_(User.email == identifier, User.login_id == identifier), User.is_active.is_(True)).first()
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


def create_user(db: Session, payload: AdminUserCreate) -> User:
    if len(payload.login_id) < 6 or len(payload.login_id) > 12:
        raise AppError("INVALID_LOGIN_ID", "Login ID must be between 6 and 12 characters", 400)
    if len(payload.password) < 8 or not any(c.islower() for c in payload.password) or not any(c.isupper() for c in payload.password) or not any(c.isdigit() for c in payload.password) or not any(not c.isalnum() for c in payload.password):
        raise AppError("WEAK_PASSWORD", "Password must contain upper, lower, number, special character, and be at least 8 characters", 400)
    if payload.role not in ("user", "accountant", "administrator", "admin"):
        raise AppError("INVALID_ROLE", "Role must be User or Administrator", 400)
    if db.query(User).filter(or_(User.email == payload.email, User.login_id == payload.login_id)).first():
        raise AppError("USER_EXISTS", "Email or Login ID already exists", 409)
    user = User(name=payload.name.strip(), login_id=payload.login_id, email=payload.email, password_hash=hash_password(payload.password), role="admin" if payload.role in ("administrator", "admin") else "accountant")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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
