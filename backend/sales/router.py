from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import CurrentUser, require_roles
from sales import service
from sales.schemas import CustomerInvoiceCreate, CustomerInvoiceOut, SalesOrderCreate, SalesOrderOut

router = APIRouter(tags=["sales"])

CAN_WRITE = require_roles("admin", "accountant")
# Invoices are readable by staff AND by the contact role - a contact can see their
# own invoices (enforced in the handler below, not by role alone).
CAN_READ_STAFF = require_roles("admin", "accountant")
CAN_READ_INVOICES = require_roles("admin", "accountant", "contact")


@router.get("/sales-orders", response_model=list[SalesOrderOut])
def list_sales_orders(db: Session = Depends(get_db), _user=Depends(CAN_READ_STAFF)):
    return service.list_sales_orders(db)


@router.post("/sales-orders", response_model=SalesOrderOut)
def create_sales_order(payload: SalesOrderCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_sales_order(db, payload)


@router.post("/sales-orders/{so_id}/generate-invoice", response_model=CustomerInvoiceOut)
def generate_invoice(so_id: int, payload: CustomerInvoiceCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.generate_customer_invoice(db, so_id, payload.invoice_date, payload.due_date)


@router.get("/customer-invoices", response_model=list[CustomerInvoiceOut])
def list_customer_invoices(db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_READ_INVOICES)):
    # A contact only ever sees invoices tied to their own contact_id - staff see everything.
    contact_id = user.contact_id if user.role == "contact" else None
    return service.list_customer_invoices(db, contact_id=contact_id)
