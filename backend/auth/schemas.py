from pydantic import BaseModel


class SignupRequest(BaseModel):
    email: str
    password: str
    role: str  # admin | accountant - contact users are created via Contact creation, not here


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    role: str
