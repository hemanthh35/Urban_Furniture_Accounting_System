class AppError(Exception):
    """A known, expected error (e.g. 'that contact doesn't exist') - as opposed to a
    real bug. Carries a machine-readable code, a human message, and the HTTP status
    to reply with. Caught once in main.py and turned into a consistent JSON shape."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
