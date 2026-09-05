from datetime import date

from pydantic import BaseModel


class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price_cents: int
    tax_percent: int = 0


class PurchaseOrderCreate(BaseModel):
    vendor_id: int
    analytic_account_id: int | None = None
    order_date: date
    items: list[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(PurchaseOrderCreate):
    pass


class PurchaseOrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price_cents: int
    tax_percent: int

    class Config:
        from_attributes = True


class PurchaseOrderOut(BaseModel):
    id: int
    vendor_id: int
    analytic_account_id: int | None
    order_date: date
    status: str
    items: list[PurchaseOrderItemOut]

    class Config:
        from_attributes = True


class VendorBillCreate(BaseModel):
    bill_date: date
    due_date: date | None = None


class VendorBillOut(BaseModel):
    id: int
    purchase_order_id: int
    bill_date: date
    due_date: date | None
    amount_cents: int
    subtotal_cents: int = 0
    tax_cents: int = 0
    paid_amount_cents: int = 0
    outstanding_amount_cents: int = 0
    status: str

    class Config:
        from_attributes = True


class VendorBillDetailOut(VendorBillOut):
    items: list["VendorBillLineOut"]
    payments: list["PaymentSummary"]


class VendorBillLineOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price_cents: int
    tax_percent: int

    class Config:
        from_attributes = True


class PaymentSummary(BaseModel):
    id: int
    method: str
    amount_cents: int
    date: date

    class Config:
        from_attributes = True
