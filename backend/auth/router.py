from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import service
from auth.schemas import LoginRequest, SignupRequest, TokenResponse
from core.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    service.signup(db, payload)
    token, role = service.login(db, LoginRequest(email=payload.email, password=payload.password))
    return TokenResponse(access_token=token, role=role)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    token, role = service.login(db, payload)
    return TokenResponse(access_token=token, role=role)
