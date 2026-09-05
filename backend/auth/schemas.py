from pydantic import BaseModel


class SignupRequest(BaseModel):
    name: str = ""
    login_id: str = ""
    email: str
    password: str
    password_confirmation: str | None = None
    role: str  # public User maps to the accountant permission set


class LoginRequest(BaseModel):
    login_id: str | None = None
    email: str | None = None  # backward-compatible with the previous login form
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    role: str


class UserOut(BaseModel):
    id: int
    name: str | None
    login_id: str | None
    email: str
    role: str
    contact_id: int | None
    is_active: bool

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    name: str
    login_id: str
    email: str
    role: str
    password: str
