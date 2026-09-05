from datetime import date

from pydantic import BaseModel


class VendorPaymentCreate(BaseModel):
    vendor_bill_id: int
    method: str  # Cash | Bank
    amount_cents: int
    date: date


class CustomerPaymentCreate(BaseModel):
    customer_invoice_id: int
    method: str  # Cash | Bank
    amount_cents: int
    date: date


class PaymentOut(BaseModel):
    id: int
    vendor_bill_id: int | None
    customer_invoice_id: int | None
    method: str
    amount_cents: int
    date: date

    class Config:
        from_attributes = True
