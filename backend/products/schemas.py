from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    type: str  # Goods | Service | Combo
    sales_price_cents: int
    cost_cents: int
    category: str | None = None


class ProductOut(BaseModel):
    id: int
    name: str
    type: str
    sales_price_cents: int
    cost_cents: int
    category: str | None

    class Config:
        from_attributes = True
