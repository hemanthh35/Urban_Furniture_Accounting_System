"""Thin wrapper around Brevo's transactional email API - same pattern already
proven working in Coreline. Email sends never raise: a failed email should
never break a real transaction (generating an invoice, recording a payment).
Callers fire-and-forget; failures just get logged.
"""

import base64
import logging

import requests

from core.config import settings

logger = logging.getLogger("urbanfurniture.email")

BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"


def send_email(to_email: str, to_name: str, subject: str, html_content: str, attachment: tuple[str, bytes] | None = None) -> bool:
    """attachment, if given, is (filename, raw_bytes) - e.g. the invoice PDF."""
    if not settings.brevo_api_key or not settings.brevo_from_email:
        logger.warning("Brevo not configured, skipping email to %s: %s", to_email, subject)
        return False

    payload = {
        "sender": {"email": settings.brevo_from_email, "name": settings.brevo_from_name},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_content,
    }
    if attachment:
        filename, raw_bytes = attachment
        payload["attachment"] = [{"name": filename, "content": base64.b64encode(raw_bytes).decode("ascii")}]
    headers = {"api-key": settings.brevo_api_key, "Content-Type": "application/json", "Accept": "application/json"}

    try:
        resp = requests.post(BREVO_ENDPOINT, json=payload, headers=headers, timeout=10)
        if resp.status_code >= 300:
            logger.warning("Brevo send failed (%s) to %s: %s", resp.status_code, to_email, resp.text)
            return False
        return True
    except requests.RequestException as exc:
        logger.warning("Brevo send raised for %s: %s", to_email, exc)
        return False


def _money(cents: int) -> str:
    return f"Rs. {cents / 100:,.2f}"


def send_invoice_email(to_email: str, to_name: str, invoice_id: int, amount_cents: int, due_date: str | None, pdf_url: str, pdf_bytes: bytes | None = None) -> bool:
    due_line = f"<p>Due by <strong>{due_date}</strong>.</p>" if due_date else ""
    html = f"""
    <p>Hi {to_name},</p>
    <p>Invoice <strong>#{invoice_id}</strong> for <strong>{_money(amount_cents)}</strong> has been generated for you.</p>
    {due_line}
    <p>The PDF is attached to this email. You can also <a href="{pdf_url}">view / download it online</a> (that link expires in 10 minutes for security - come back to your account to get a fresh one anytime).</p>
    <p>- Urban Furniture</p>
    """
    attachment = (f"Invoice-{invoice_id}.pdf", pdf_bytes) if pdf_bytes else None
    return send_email(to_email, to_name, f"Invoice #{invoice_id} from Urban Furniture", html, attachment=attachment)


def send_payment_received_email(to_email: str, to_name: str, invoice_id: int, amount_cents: int) -> bool:
    html = f"""
    <p>Hi {to_name},</p>
    <p>We've received your payment of <strong>{_money(amount_cents)}</strong> for invoice <strong>#{invoice_id}</strong>. Thank you!</p>
    <p>- Urban Furniture</p>
    """
    return send_email(to_email, to_name, f"Payment received - Invoice #{invoice_id}", html)


def send_payment_reminder_email(to_email: str, to_name: str, invoice_id: int, outstanding_cents: int, due_date: str) -> bool:
    html = f"""
    <p>Hi {to_name},</p>
    <p>This is a reminder that invoice <strong>#{invoice_id}</strong> for <strong>{_money(outstanding_cents)}</strong>
    was due on <strong>{due_date}</strong> and is still unpaid.</p>
    <p>Please log in to your account to pay it online, or contact us if you've already paid.</p>
    <p>- Urban Furniture</p>
    """
    return send_email(to_email, to_name, f"Reminder: Invoice #{invoice_id} is overdue", html)
