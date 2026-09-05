from datetime import date

from pydantic import BaseModel


class StockReportRow(BaseModel):
    product_id: int
    product_name: str
    quantity_in: int
    quantity_out: int
    quantity_on_hand: int


class StockMovementOut(BaseModel):
    id: int
    product_id: int
    source_type: str
    source_id: int
    movement_date: date
    quantity_delta: int

    class Config:
        from_attributes = True
