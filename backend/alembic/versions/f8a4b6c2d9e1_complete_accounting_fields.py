"""complete accounting fields and document lines

Revision ID: f8a4b6c2d9e1
Revises: e7f2a3b4c5d6
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8a4b6c2d9e1"
down_revision: Union[str, None] = "e7f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("journals", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("purchase_order_items", sa.Column("tax_percent", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("vendor_bills", sa.Column("subtotal_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("vendor_bills", sa.Column("tax_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("customer_invoices", sa.Column("subtotal_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("customer_invoices", sa.Column("tax_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("budgets", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("budgets", sa.Column("end_date", sa.Date(), nullable=True))
    op.add_column("stock_movements", sa.Column("reason", sa.String(length=255), nullable=True))

    op.execute("UPDATE vendor_bills SET subtotal_cents = amount_cents WHERE subtotal_cents = 0")
    op.execute("UPDATE customer_invoices SET subtotal_cents = amount_cents WHERE subtotal_cents = 0")

    op.create_table(
        "vendor_bill_lines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vendor_bill_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("tax_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["vendor_bill_id"], ["vendor_bills.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_vendor_bill_lines_id"), "vendor_bill_lines", ["id"], unique=False)

    op.create_table(
        "customer_invoice_lines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_invoice_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("tax_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["customer_invoice_id"], ["customer_invoices.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_customer_invoice_lines_id"), "customer_invoice_lines", ["id"], unique=False)

    op.create_check_constraint("ck_payment_one_document", "payments", "(vendor_bill_id IS NOT NULL) <> (customer_invoice_id IS NOT NULL)")
    op.create_check_constraint("ck_payment_method", "payments", "method IN ('Cash', 'Bank')")
    op.create_check_constraint("ck_payment_amount_positive", "payments", "amount_cents > 0")


def downgrade() -> None:
    op.drop_constraint("ck_payment_amount_positive", "payments", type_="check")
    op.drop_constraint("ck_payment_method", "payments", type_="check")
    op.drop_constraint("ck_payment_one_document", "payments", type_="check")
    op.drop_index(op.f("ix_customer_invoice_lines_id"), table_name="customer_invoice_lines")
    op.drop_table("customer_invoice_lines")
    op.drop_index(op.f("ix_vendor_bill_lines_id"), table_name="vendor_bill_lines")
    op.drop_table("vendor_bill_lines")
    for table, column in (("stock_movements", "reason"), ("budgets", "end_date"), ("budgets", "start_date"), ("customer_invoices", "tax_cents"), ("customer_invoices", "subtotal_cents"), ("vendor_bills", "tax_cents"), ("vendor_bills", "subtotal_cents"), ("purchase_order_items", "tax_percent"), ("journals", "is_archived"), ("users", "is_active")):
        op.drop_column(table, column)
