"""Signs short-lived download tokens for PDF links. A plain <a href> link can't
carry an Authorization header, so a link needs its own built-in proof of who
it's for and how long it's valid - that's what this token is."""

import hashlib
import hmac
import time

from core.config import settings

_TTL_SECONDS = 600  # 10 minutes - long enough to click, short enough to matter


def sign_document_token(doc_type: str, doc_id: int, ttl_seconds: int = _TTL_SECONDS) -> tuple[str, int]:
    # A PDF link only needs to survive one click right after it's generated, so
    # the default 10 minutes is plenty - but a "Pay Now" link in an email is
    # meant to still work whenever the customer gets around to opening it,
    # hours or days later, so callers like that pass a much longer ttl_seconds.
    expires_at = int(time.time()) + ttl_seconds
    payload = f"{doc_type}:{doc_id}:{expires_at}"
    signature = hmac.new(settings.jwt_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{expires_at}.{signature}", expires_at


def verify_document_token(doc_type: str, doc_id: int, token: str) -> bool:
    try:
        expires_at_str, signature = token.split(".", 1)
        expires_at = int(expires_at_str)
    except ValueError:
        return False
    if time.time() > expires_at:
        return False
    payload = f"{doc_type}:{doc_id}:{expires_at}"
    expected = hmac.new(settings.jwt_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
