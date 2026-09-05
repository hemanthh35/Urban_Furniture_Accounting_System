"""add razorpay payment fields

Revision ID: a1b2c3d4e5f6
Revises: f8a4b6c2d9e1
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "g1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("razorpay_order_id", sa.String(length=64), nullable=True))
    op.add_column("payments", sa.Column("razorpay_payment_id", sa.String(length=64), nullable=True))
    op.drop_constraint("ck_payment_method", "payments", type_="check")
    op.create_check_constraint("ck_payment_method", "payments", "method IN ('Cash', 'Bank', 'Razorpay')")


def downgrade() -> None:
    op.drop_constraint("ck_payment_method", "payments", type_="check")
    op.create_check_constraint("ck_payment_method", "payments", "method IN ('Cash', 'Bank')")
    op.drop_column("payments", "razorpay_payment_id")
    op.drop_column("payments", "razorpay_order_id")
