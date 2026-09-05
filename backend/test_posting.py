"""One-off script to verify the posting engine actually works end to end - not part
of the app, just a manual check. Seeds the Chart of Accounts, posts one of each of
the 4 transaction types, then checks debits == credits overall (the actual rule
double-entry accounting exists to enforce)."""

from datetime import date

from accounts.models import Account
from core.database import SessionLocal
from journals.models import JournalEntryLine
from journals.posting import post_customer_invoice, post_customer_payment, post_vendor_bill, post_vendor_payment

db = SessionLocal()

# Seed the exact Chart of Accounts from the problem statement's own example.
required = [
    ("Cash", "Asset"), ("Bank", "Asset"), ("Debtors", "Asset"),
    ("Creditors", "Liability"), ("Sale Income", "Income"), ("Purchase Expense", "Expense"),
]
for name, type_ in required:
    if not db.query(Account).filter(Account.name == name).first():
        db.add(Account(name=name, type=type_))
db.commit()

post_vendor_bill(db, date.today(), "BILL-TEST-1", 500000)
post_customer_invoice(db, date.today(), "INV-TEST-1", 300000)
post_customer_payment(db, date.today(), "PAY-TEST-1", 300000, "Bank")
post_vendor_payment(db, date.today(), "PAY-TEST-2", 500000, "Cash")
db.commit()

total_debit = sum(l.debit_cents for l in db.query(JournalEntryLine).all())
total_credit = sum(l.credit_cents for l in db.query(JournalEntryLine).all())
print(f"Total debits:  {total_debit}")
print(f"Total credits: {total_credit}")
print("BALANCED" if total_debit == total_credit else "NOT BALANCED - BUG")

db.close()
