from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    type: str  # Goods | Service | Combo
    sales_price_cents: int
    cost_cents: int
    category: str | None = None
    # Saved once per product so Sales/Purchase Order lines can auto-fill their
    # tax % instead of it being retyped by hand every time.
    gst_percent: int = 0


class ProductUpdate(ProductCreate):
    pass


class ProductOut(BaseModel):
    id: int
    name: str
    type: str
    sales_price_cents: int
    cost_cents: int
    category: str | None
    gst_percent: int = 0
    is_archived: bool = False

    class Config:
        from_attributes = True
