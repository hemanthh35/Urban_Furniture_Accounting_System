from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str
    type: str  # Asset | Liability | Expense | Income | Capital


class AccountOut(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True
