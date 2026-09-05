"""Signs short-lived download tokens for PDF links. A plain <a href> link can't
carry an Authorization header, so a link needs its own built-in proof of who
it's for and how long it's valid - that's what this token is."""

import hashlib
import hmac
import time

from core.config import settings

_TTL_SECONDS = 600  # 10 minutes - long enough to click, short enough to matter


def sign_document_token(doc_type: str, doc_id: int) -> tuple[str, int]:
    expires_at = int(time.time()) + _TTL_SECONDS
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
