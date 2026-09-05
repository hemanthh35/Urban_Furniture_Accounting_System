from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import CurrentUser, require_roles
from payments import service
from payments.schemas import CustomerPaymentCreate, PaymentOut, VendorPaymentCreate

router = APIRouter(tags=["payments"])

CAN_PAY_VENDOR = require_roles("admin", "accountant")  # contacts never pay a vendor bill
CAN_PAY_CUSTOMER = require_roles("admin", "accountant", "contact")  # a contact pays their own invoice


@router.post("/vendor-bills/{bill_id}/pay", response_model=PaymentOut)
def pay_vendor_bill(bill_id: int, payload: VendorPaymentCreate, db: Session = Depends(get_db), _user=Depends(CAN_PAY_VENDOR)):
    return service.pay_vendor_bill(db, bill_id, payload.method, payload.amount_cents, payload.date)


@router.post("/customer-invoices/{invoice_id}/pay", response_model=PaymentOut)
def pay_customer_invoice(invoice_id: int, payload: CustomerPaymentCreate, db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_PAY_CUSTOMER)):
    contact_id = user.contact_id if user.role == "contact" else None
    return service.pay_customer_invoice(db, invoice_id, payload.method, payload.amount_cents, payload.date, contact_id)
