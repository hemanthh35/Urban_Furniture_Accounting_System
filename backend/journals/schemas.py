from datetime import date

from pydantic import BaseModel


class JournalCreate(BaseModel):
    name: str
    type: str
    default_account_id: int | None = None


class JournalOut(BaseModel):
    id: int
    name: str
    type: str
    default_account_id: int | None
    is_archived: bool = False

    class Config:
        from_attributes = True


class JournalEntryLineOut(BaseModel):
    id: int
    account_id: int
    account_name: str
    debit_cents: int
    credit_cents: int


class JournalEntryOut(BaseModel):
    id: int
    journal_id: int
    journal_name: str
    date: date
    reference: str | None
    lines: list[JournalEntryLineOut]
