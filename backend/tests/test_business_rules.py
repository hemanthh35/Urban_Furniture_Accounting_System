import unittest
from datetime import date

from auth.schemas import SignupRequest
from budgets.schemas import BudgetCreate
from purchases.schemas import PurchaseOrderCreate
from sales.schemas import SalesOrderCreate


class BusinessRuleSchemaTests(unittest.TestCase):
    def test_signup_payload_keeps_role_explicit(self):
        payload = SignupRequest(email="user@example.com", password="password123", role="accountant")
        self.assertEqual(payload.role, "accountant")

    def test_order_payload_contains_lines_and_date(self):
        purchase = PurchaseOrderCreate(vendor_id=1, order_date=date.today(), items=[])
        sale = SalesOrderCreate(customer_id=1, order_date=date.today(), items=[])
        self.assertEqual(purchase.items, [])
        self.assertEqual(sale.items, [])

    def test_budget_payload_has_real_period(self):
        budget = BudgetCreate(name="Q1", period="2026-Q1", responsible_person=None, planned_amount_cents=10000, analytic_account_id=1, start_date=date(2026, 1, 1), end_date=date(2026, 3, 31))
        self.assertLessEqual(budget.start_date, budget.end_date)


if __name__ == "__main__":
    unittest.main()
