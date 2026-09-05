from pydantic import BaseModel


class SignupRequest(BaseModel):
    email: str
    password: str
    role: str  # admin | accountant - contact users are created via Contact creation, not here


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    role: str


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    contact_id: int | None
    is_active: bool

    class Config:
        from_attributes = True
