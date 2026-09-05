from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import CurrentUser, require_roles
from purchases import service
from purchases.schemas import PurchaseOrderCreate, PurchaseOrderOut, VendorBillCreate, VendorBillDetailOut, VendorBillOut

router = APIRouter(tags=["purchases"])

CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")
CAN_READ_BILLS = require_roles("admin", "accountant", "contact")


@router.get("/purchase-orders", response_model=list[PurchaseOrderOut])
def list_purchase_orders(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_purchase_orders(db)


@router.post("/purchase-orders", response_model=PurchaseOrderOut)
def create_purchase_order(payload: PurchaseOrderCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_purchase_order(db, payload)


@router.post("/purchase-orders/{po_id}/convert-to-bill", response_model=VendorBillOut)
def convert_to_bill(po_id: int, payload: VendorBillCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.convert_to_vendor_bill(db, po_id, payload.bill_date, payload.due_date)


@router.get("/vendor-bills", response_model=list[VendorBillOut])
def list_vendor_bills(db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_READ_BILLS)):
    contact_id = user.contact_id if user.role == "contact" else None
    return service.list_vendor_bills(db, contact_id)


@router.get("/vendor-bills/{bill_id}", response_model=VendorBillDetailOut)
def get_vendor_bill_detail(bill_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_READ_BILLS)):
    bill = service.get_vendor_bill(db, bill_id)
    if user.role == "contact":
        po = service.get_purchase_order(db, bill.purchase_order_id)
        if po.vendor_id != user.contact_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="You can only view your own vendor bills")
    return service.get_vendor_bill_detail(db, bill_id)
