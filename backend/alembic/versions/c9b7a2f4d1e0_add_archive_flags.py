"""add archive flags to master data

Revision ID: c9b7a2f4d1e0
Revises: 6f8ed1c307dc
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9b7a2f4d1e0"
down_revision: Union[str, None] = "6f8ed1c307dc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("contacts", "products", "accounts", "analytic_accounts", "budgets"):
        op.add_column(table, sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    for table in ("budgets", "analytic_accounts", "accounts", "products", "contacts"):
        op.drop_column(table, "is_archived")
