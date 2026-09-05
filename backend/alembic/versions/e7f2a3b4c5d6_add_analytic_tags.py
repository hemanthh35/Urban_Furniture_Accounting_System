"""add analytic tags to orders and journal lines

Revision ID: e7f2a3b4c5d6
Revises: d4e8f1a2b3c4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7f2a3b4c5d6"
down_revision: Union[str, None] = "d4e8f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("purchase_orders", sa.Column("analytic_account_id", sa.Integer(), nullable=True))
    op.add_column("sales_orders", sa.Column("analytic_account_id", sa.Integer(), nullable=True))
    op.add_column("journal_entry_lines", sa.Column("analytic_account_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_purchase_orders_analytic_account", "purchase_orders", "analytic_accounts", ["analytic_account_id"], ["id"])
    op.create_foreign_key("fk_sales_orders_analytic_account", "sales_orders", "analytic_accounts", ["analytic_account_id"], ["id"])
    op.create_foreign_key("fk_journal_lines_analytic_account", "journal_entry_lines", "analytic_accounts", ["analytic_account_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_journal_lines_analytic_account", "journal_entry_lines", type_="foreignkey")
    op.drop_constraint("fk_sales_orders_analytic_account", "sales_orders", type_="foreignkey")
    op.drop_constraint("fk_purchase_orders_analytic_account", "purchase_orders", type_="foreignkey")
    op.drop_column("journal_entry_lines", "analytic_account_id")
    op.drop_column("sales_orders", "analytic_account_id")
    op.drop_column("purchase_orders", "analytic_account_id")
