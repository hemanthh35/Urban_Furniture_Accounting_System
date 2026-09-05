from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import CurrentUser, require_roles
from core.signing import sign_document_token, verify_document_token
from purchases.service import get_vendor_bill
from reports import service
from reports.pdf import build_customer_invoice_pdf, build_vendor_bill_pdf
from reports.schemas import BalanceSheet, BudgetReport, DashboardSummary, ProfitAndLoss
from sales.service import get_customer_invoice

router = APIRouter(prefix="/reports", tags=["reports"])

CAN_VIEW = require_roles("admin", "accountant")
CAN_VIEW_INVOICE = require_roles("admin", "accountant", "contact")


@router.get("/balance-sheet", response_model=BalanceSheet)
def get_balance_sheet(from_date: date | None = None, to_date: date | None = None, db: Session = Depends(get_db), _user=Depends(CAN_VIEW)):
    return service.balance_sheet(db, from_date, to_date)


@router.get("/profit-and-loss", response_model=ProfitAndLoss)
def get_profit_and_loss(from_date: date | None = None, to_date: date | None = None, db: Session = Depends(get_db), _user=Depends(CAN_VIEW)):
    return service.profit_and_loss(db, from_date, to_date)


@router.get("/budget-report", response_model=BudgetReport)
def get_budget_report(from_date: date | None = None, to_date: date | None = None, db: Session = Depends(get_db), _user=Depends(CAN_VIEW)):
    return service.budget_report(db, from_date, to_date)


@router.get("/dashboard-summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db), _user=Depends(CAN_VIEW)):
    return service.dashboard_summary(db)


# --- PDF downloads ---------------------------------------------------------
# A plain link (opened in a new tab, pasted into an email) can't carry our JWT
# in an Authorization header. So the flow is: an authenticated request first
# asks for a link, we hand back a URL with a signed, expiring token baked in,
# and *that* URL is what actually serves the PDF - no login needed to open it,
# but it's only valid for one document, for 10 minutes.


@router.get("/customer-invoices/{invoice_id}/pdf-link")
def get_customer_invoice_pdf_link(invoice_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_VIEW_INVOICE)):
    invoice = get_customer_invoice(db, invoice_id)
    if user.role == "contact":
        from payments.service import ensure_contact_invoice_access
        ensure_contact_invoice_access(db, invoice, user.contact_id)
    token, expires_at = sign_document_token("customer-invoice", invoice_id)
    return {"url": f"/reports/public/customer-invoices/{invoice_id}/pdf?token={token}", "expires_at": expires_at}


@router.get("/public/customer-invoices/{invoice_id}/pdf")
def download_customer_invoice_pdf(invoice_id: int, token: str, db: Session = Depends(get_db)):
    if not verify_document_token("customer-invoice", invoice_id, token):
        raise HTTPException(status_code=403, detail="Invalid or expired download link")
    invoice = get_customer_invoice(db, invoice_id)
    pdf_bytes = build_customer_invoice_pdf(db, invoice)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=invoice-{invoice_id}.pdf"})


@router.get("/vendor-bills/{bill_id}/pdf-link")
def get_vendor_bill_pdf_link(bill_id: int, db: Session = Depends(get_db), _user=Depends(CAN_VIEW)):
    get_vendor_bill(db, bill_id)
    token, expires_at = sign_document_token("vendor-bill", bill_id)
    return {"url": f"/reports/public/vendor-bills/{bill_id}/pdf?token={token}", "expires_at": expires_at}


@router.get("/public/vendor-bills/{bill_id}/pdf")
def download_vendor_bill_pdf(bill_id: int, token: str, db: Session = Depends(get_db)):
    if not verify_document_token("vendor-bill", bill_id, token):
        raise HTTPException(status_code=403, detail="Invalid or expired download link")
    bill = get_vendor_bill(db, bill_id)
    pdf_bytes = build_vendor_bill_pdf(db, bill)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=bill-{bill_id}.pdf"})
