from datetime import date

from pydantic import BaseModel


class SalesOrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price_cents: int
    tax_percent: int = 0


class SalesOrderCreate(BaseModel):
    customer_id: int
    analytic_account_id: int | None = None
    order_date: date
    items: list[SalesOrderItemCreate]


class SalesOrderUpdate(SalesOrderCreate):
    pass


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
    analytic_account_id: int | None
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
    subtotal_cents: int = 0
    tax_cents: int = 0
    paid_amount_cents: int = 0
    outstanding_amount_cents: int = 0
    status: str

    class Config:
        from_attributes = True


class CustomerInvoiceDetailOut(CustomerInvoiceOut):
    items: list["CustomerInvoiceLineOut"]
    payments: list["PaymentSummary"]


class CustomerInvoiceLineOut(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
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
