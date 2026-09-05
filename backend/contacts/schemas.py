from pydantic import BaseModel


class ContactCreate(BaseModel):
    name: str
    type: str  # Customer | Vendor | Both
    email: str | None = None
    mobile: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    profile_image: str | None = None
    # Optional: per the problem statement, "Contact users can be created when
    # creating Contact Master data" - pass a password to also create their login.
    # Needs email set too, since that's what they'll log in with.
    create_login_password: str | None = None


class ContactUpdate(BaseModel):
    name: str
    type: str
    email: str | None = None
    mobile: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    profile_image: str | None = None


class GrantPortalAccess(BaseModel):
    password: str


class ContactOut(BaseModel):
    id: int
    name: str
    type: str
    email: str | None
    mobile: str | None
    city: str | None
    state: str | None
    pincode: str | None
    profile_image: str | None
    is_archived: bool = False

    class Config:
        from_attributes = True
