import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# Make ``backend/`` importable regardless of the working directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.modules.blood_banks.models  # noqa: E402, F401
import app.modules.donors.models  # noqa: E402, F401
import app.modules.locations.models  # noqa: E402, F401
import app.modules.requests.models  # noqa: E402, F401
import app.modules.responses.models  # noqa: E402, F401
import app.modules.users.models  # noqa: E402, F401
from app.core.config import settings  # noqa: E402
from app.db.base import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use the application's ORM metadata for autogeneration
target_metadata = Base.metadata

# Override sqlalchemy.url from application settings
config.set_main_option("sqlalchemy.url", settings.sync_database_url)

# PostGIS installs system objects (spatial_ref_sys, tiger/topology schemas).
# They are extension-owned, not application schema, and must not appear as
# autogenerate drift.
POSTGIS_MANAGED_SCHEMAS = {"tiger", "topology"}
POSTGIS_MANAGED_TABLES = {"spatial_ref_sys", "geometry_columns", "geography_columns"}


def include_object(
    obj: object,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: object | None,
) -> bool:
    if type_ == "table" and reflected:
        if name in POSTGIS_MANAGED_TABLES:
            return False
        if getattr(obj, "schema", None) in POSTGIS_MANAGED_SCHEMAS:
            return False
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        # The PostGIS image adds ``topology`` and ``tiger`` to search_path,
        # which would make their extension tables visible to autogenerate.
        connect_args={"options": "-csearch_path=public"},
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
