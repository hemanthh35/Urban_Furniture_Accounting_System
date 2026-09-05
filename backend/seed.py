"""Run once after migrations: python seed.py
Creates the admin login and the Chart of Accounts the posting engine requires to
exist (see journals/posting.py) - without these accounts, the very first bill or
invoice would fail with ACCOUNT_NOT_FOUND."""

from accounts.models import Account
from auth.models import User
import contacts.models  # noqa: F401 - registers Contact so User.contact_id's FK resolves
from core.config import settings
from core.database import SessionLocal
from core.security import hash_password

db = SessionLocal()

if not db.query(User).filter(User.email == settings.admin_email).first():
    db.add(User(email=settings.admin_email, password_hash=hash_password(settings.admin_password), role="admin", is_active=True))
    print(f"Created admin user: {settings.admin_email}")

# Exactly the Chart of Accounts from the problem statement's own example.
required_accounts = [
    ("Cash", "Asset"),
    ("Bank", "Asset"),
    ("Debtors", "Asset"),
    ("Creditors", "Liability"),
    ("Sale Income", "Income"),
    ("Purchase Expense", "Expense"),
    ("Tax Payable", "Liability"),
    ("Tax Recoverable", "Asset"),
]
for name, type_ in required_accounts:
    if not db.query(Account).filter(Account.name == name).first():
        db.add(Account(name=name, type=type_))
        print(f"Created account: {name} ({type_})")

db.commit()
db.close()
print("Seed complete.")
