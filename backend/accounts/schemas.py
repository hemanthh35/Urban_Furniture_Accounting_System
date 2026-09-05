from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str
    type: str  # Asset | Liability | Expense | Income | Capital


class AccountUpdate(AccountCreate):
    pass


class AccountOut(BaseModel):
    id: int
    name: str
    type: str
    is_archived: bool = False

    class Config:
        from_attributes = True
