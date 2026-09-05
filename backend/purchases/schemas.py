from datetime import date

from pydantic import BaseModel


class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price_cents: int


class PurchaseOrderCreate(BaseModel):
    vendor_id: int
    order_date: date
    items: list[PurchaseOrderItemCreate]


class PurchaseOrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price_cents: int

    class Config:
        from_attributes = True


class PurchaseOrderOut(BaseModel):
    id: int
    vendor_id: int
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
    status: str

    class Config:
        from_attributes = True
