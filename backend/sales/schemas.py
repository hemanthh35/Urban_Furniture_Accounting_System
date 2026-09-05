from datetime import date

from pydantic import BaseModel


class SalesOrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price_cents: int
    tax_percent: int = 0


class SalesOrderCreate(BaseModel):
    customer_id: int
    order_date: date
    items: list[SalesOrderItemCreate]


class SalesOrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price_cents: int
    tax_percent: int

    class Config:
        from_attributes = True


class SalesOrderOut(BaseModel):
    id: int
    customer_id: int
    order_date: date
    status: str
    items: list[SalesOrderItemOut]

    class Config:
        from_attributes = True


class CustomerInvoiceCreate(BaseModel):
    invoice_date: date
    due_date: date | None = None


class CustomerInvoiceOut(BaseModel):
    id: int
    sales_order_id: int
    invoice_date: date
    due_date: date | None
    amount_cents: int
    status: str

    class Config:
        from_attributes = True
