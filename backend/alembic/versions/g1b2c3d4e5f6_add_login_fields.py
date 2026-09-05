"""add wireframe login fields"""

from alembic import op
import sqlalchemy as sa


revision = "g1b2c3d4e5f6"
down_revision = "f8a4b6c2d9e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("login_id", sa.String(length=32), nullable=True))
    op.create_index("ix_users_login_id", "users", ["login_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_login_id", table_name="users")
    op.drop_column("users", "login_id")
    op.drop_column("users", "name")
