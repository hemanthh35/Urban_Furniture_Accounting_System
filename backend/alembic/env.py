"""Alembic's entrypoint. The only customization here vs the default template:
we point it at our real database URL (from core/config.py, i.e. the .env file)
instead of the placeholder in alembic.ini, and we import every model module so
Base.metadata knows about all our tables for autogenerate to compare against."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from core.config import settings
from core.database import Base

# Import every model module so their tables register on Base.metadata - autogenerate
# can only see tables that have actually been imported somewhere.
import auth.models  # noqa: F401
import contacts.models  # noqa: F401
import products.models  # noqa: F401
import accounts.models  # noqa: F401
import budgets.models  # noqa: F401
import journals.models  # noqa: F401
import purchases.models  # noqa: F401
import sales.models  # noqa: F401
import payments.models  # noqa: F401
import stock.models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(config.get_section(config.config_ini_section), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
