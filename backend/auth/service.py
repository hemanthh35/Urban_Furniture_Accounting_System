from sqlalchemy.orm import Session

from auth.models import User
from auth.schemas import LoginRequest, SignupRequest
from core.errors import AppError
from core.security import create_access_token, hash_password, verify_password


def signup(db: Session, payload: SignupRequest) -> User:
    if payload.role not in ("admin", "accountant"):
        raise AppError("INVALID_ROLE", "Signup is only for admin or accountant - contact users are created via Contact creation", 400)
    if db.query(User).filter(User.email == payload.email).first():
        raise AppError("EMAIL_TAKEN", "An account with that email already exists", 409)

    user = User(email=payload.email, password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, payload: LoginRequest) -> tuple[str, str]:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise AppError("INVALID_CREDENTIALS", "Wrong email or password", 401)
    token = create_access_token(user.id, user.role)
    return token, user.role
