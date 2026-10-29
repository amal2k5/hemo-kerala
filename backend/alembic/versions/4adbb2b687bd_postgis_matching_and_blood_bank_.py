"""postgis matching and blood bank directory

Revision ID: 4adbb2b687bd
Revises: e75bc6150498
Create Date: 2026-10-29 20:15:00.000000

"""

from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4adbb2b687bd"
down_revision: Union[str, None] = "e75bc6150498"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostGIS is required for indexed distance filtering. The migration
    # deliberately keeps this idempotent: managed databases may pre-install it.
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.add_column(
        "donor_profiles",
        sa.Column(
            "location",
            geoalchemy2.types.Geography(
                geometry_type="POINT",
                srid=4326,
                spatial_index=False,
            ),
            nullable=True,
        ),
    )
    op.add_column(
        "blood_requests",
        sa.Column(
            "location",
            geoalchemy2.types.Geography(
                geometry_type="POINT",
                srid=4326,
                spatial_index=False,
            ),
            nullable=True,
        ),
    )

    # Backfill from existing coordinates; rows without coordinates stay NULL.
    op.execute(
        """
        UPDATE donor_profiles
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE blood_requests
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """
    )

    op.create_index(
        "ix_donor_profiles_location",
        "donor_profiles",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )
    op.create_index(
        "ix_blood_requests_location",
        "blood_requests",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )

    op.create_table(
        "blood_banks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("locality", sa.String(length=255), nullable=True),
        sa.Column("district_id", sa.Integer(), nullable=False),
        sa.Column("public_phone", sa.String(length=50), nullable=True),
        sa.Column("public_email", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.types.Geography(
                geometry_type="POINT",
                srid=4326,
                spatial_index=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "verification_status",
            sa.Enum(
                "verified",
                "unverified",
                "stale",
                "unknown",
                name="verification_status",
            ),
            server_default="unknown",
            nullable=False,
        ),
        sa.Column("verification_date", sa.Date(), nullable=True),
        sa.Column("source_url", sa.String(length=1000), nullable=True),
        sa.Column(
            "is_approved",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "verification_status <> 'verified' "
            "OR (verification_date IS NOT NULL AND source_url IS NOT NULL)",
            name=op.f("ck_blood_banks_verified_requires_evidence"),
        ),
        sa.CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name=op.f("ck_blood_banks_latitude_range"),
        ),
        sa.CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name=op.f("ck_blood_banks_longitude_range"),
        ),
        sa.ForeignKeyConstraint(
            ["district_id"],
            ["districts.id"],
            name=op.f("fk_blood_banks_district_id_districts"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_blood_banks")),
    )
    op.create_index(
        op.f("ix_blood_banks_name"),
        "blood_banks",
        ["name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_blood_banks_district_id"),
        "blood_banks",
        ["district_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_blood_banks_is_approved"),
        "blood_banks",
        ["is_approved"],
        unique=False,
    )
    op.create_index(
        "ix_blood_banks_location",
        "blood_banks",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )


def downgrade() -> None:
    op.drop_index("ix_blood_banks_location", table_name="blood_banks")
    op.drop_index(op.f("ix_blood_banks_is_approved"), table_name="blood_banks")
    op.drop_index(op.f("ix_blood_banks_district_id"), table_name="blood_banks")
    op.drop_index(op.f("ix_blood_banks_name"), table_name="blood_banks")
    op.drop_table("blood_banks")

    op.drop_index("ix_blood_requests_location", table_name="blood_requests")
    op.drop_column("blood_requests", "location")

    op.drop_index("ix_donor_profiles_location", table_name="donor_profiles")
    op.drop_column("donor_profiles", "location")

    op.execute("DROP TYPE IF EXISTS verification_status")
    # The PostGIS extension is intentionally left installed: other schemas or
    # future migrations may depend on it.
