from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import CurrentUser, require_roles
from core.signing import verify_document_token
from payments import service
from payments.schemas import CheckoutResponse, CustomerPaymentCreate, PaymentOut, VendorPaymentCreate
from purchases.service import get_purchase_order, get_vendor_bill
from sales.service import get_customer_invoice

router = APIRouter(tags=["payments"])

CAN_PAY_VENDOR = require_roles("admin", "accountant")  # contacts never pay a vendor bill
CAN_PAY_CUSTOMER = require_roles("admin", "accountant", "contact")  # a contact pays their own invoice
CAN_READ = require_roles("admin", "accountant", "contact")


@router.get("/vendor-bills/{bill_id}/payments", response_model=list[PaymentOut])
def list_vendor_bill_payments(bill_id: int, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    bill = get_vendor_bill(db, bill_id)
    if _user.role == "contact" and get_purchase_order(db, bill.purchase_order_id).vendor_id != _user.contact_id:
        from core.errors import AppError
        raise AppError("FORBIDDEN", "You can only view your own vendor bill payments", 403)
    return service.list_payments(db, vendor_bill_id=bill_id)


@router.get("/customer-invoices/{invoice_id}/payments", response_model=list[PaymentOut])
def list_customer_invoice_payments(invoice_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_READ)):
    invoice = get_customer_invoice(db, invoice_id)
    if user.role == "contact":
        service.ensure_contact_invoice_access(db, invoice, user.contact_id)
    return service.list_payments(db, customer_invoice_id=invoice_id)


@router.post("/vendor-bills/{bill_id}/pay", response_model=PaymentOut)
def pay_vendor_bill(bill_id: int, payload: VendorPaymentCreate, db: Session = Depends(get_db), _user=Depends(CAN_PAY_VENDOR)):
    return service.pay_vendor_bill(db, bill_id, payload.method, payload.amount_cents, payload.date)


@router.post("/customer-invoices/{invoice_id}/pay", response_model=PaymentOut)
def pay_customer_invoice(invoice_id: int, payload: CustomerPaymentCreate, db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_PAY_CUSTOMER)):
    contact_id = user.contact_id if user.role == "contact" else None
    return service.pay_customer_invoice(db, invoice_id, payload.method, payload.amount_cents, payload.date, contact_id)


@router.post("/customer-invoices/{invoice_id}/checkout", response_model=CheckoutResponse)
def create_invoice_checkout(invoice_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_PAY_CUSTOMER)):
    contact_id = user.contact_id if user.role == "contact" else None
    return service.create_invoice_checkout(db, invoice_id, contact_id)


@router.post("/public/customer-invoices/{invoice_id}/checkout", response_model=CheckoutResponse)
def create_public_invoice_checkout(invoice_id: int, token: str, db: Session = Depends(get_db)):
    """The "Pay Now" link in invoice/reminder emails lands here - no login, same
    signed-token trust model as the PDF download links. The token proves the
    click came from that specific email, which is authorization enough."""
    if not verify_document_token("customer-invoice", invoice_id, token):
        raise HTTPException(status_code=403, detail="Invalid or expired payment link")
    return service.create_invoice_checkout(db, invoice_id, contact_id=None)


@router.post("/payments/webhook", status_code=200)
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Called by Razorpay's servers, not the frontend - no JWT auth here. Trust is
    established entirely through the HMAC signature check inside handle_razorpay_webhook."""
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    service.handle_razorpay_webhook(db, raw_body, signature)
    return {"status": "ok"}
