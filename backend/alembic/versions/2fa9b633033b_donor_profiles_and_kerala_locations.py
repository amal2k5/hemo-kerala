"""donor profiles and kerala locations

Revision ID: 2fa9b633033b
Revises: 7ba3e0eb21cf
Create Date: 2026-10-29 18:21:02.314045

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2fa9b633033b"
down_revision: Union[str, None] = "7ba3e0eb21cf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Kerala's 14 districts are stable public administrative units. Codes are
# internal slugs, not official government codes.
# Source: Kerala Local Self Government Department (https://lsgkerala.gov.in/).
KERALA_DISTRICTS = [
    {"code": "kasaragod", "name": "Kasaragod"},
    {"code": "kannur", "name": "Kannur"},
    {"code": "wayanad", "name": "Wayanad"},
    {"code": "kozhikode", "name": "Kozhikode"},
    {"code": "malappuram", "name": "Malappuram"},
    {"code": "palakkad", "name": "Palakkad"},
    {"code": "thrissur", "name": "Thrissur"},
    {"code": "ernakulam", "name": "Ernakulam"},
    {"code": "idukki", "name": "Idukki"},
    {"code": "kottayam", "name": "Kottayam"},
    {"code": "alappuzha", "name": "Alappuzha"},
    {"code": "pathanamthitta", "name": "Pathanamthitta"},
    {"code": "kollam", "name": "Kollam"},
    {"code": "thiruvananthapuram", "name": "Thiruvananthapuram"},
]


def upgrade() -> None:
    op.create_table(
        "districts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_districts")),
    )
    op.create_index(op.f("ix_districts_code"), "districts", ["code"], unique=True)
    op.create_index(op.f("ix_districts_name"), "districts", ["name"], unique=True)

    op.create_table(
        "local_bodies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("district_id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "grama_panchayat",
                "municipality",
                "corporation",
                name="local_body_type",
            ),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.ForeignKeyConstraint(
            ["district_id"],
            ["districts.id"],
            name=op.f("fk_local_bodies_district_id_districts"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_local_bodies")),
        sa.UniqueConstraint(
            "district_id",
            "type",
            "name",
            name="uq_local_bodies_district_type_name",
        ),
    )
    op.create_index(
        op.f("ix_local_bodies_district_id"),
        "local_bodies",
        ["district_id"],
        unique=False,
    )

    op.create_table(
        "donor_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "blood_group",
            sa.Enum(
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-",
                name="blood_group",
            ),
            nullable=False,
        ),
        sa.Column(
            "availability_status",
            sa.Enum(
                "available",
                "paused",
                "withdrawn",
                name="availability_status",
            ),
            server_default="available",
            nullable=False,
        ),
        sa.Column("district_id", sa.Integer(), nullable=True),
        sa.Column("local_body_id", sa.Integer(), nullable=True),
        sa.Column("locality", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column(
            "contact_verified",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("contact_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name=op.f("ck_donor_profiles_latitude_range"),
        ),
        sa.CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name=op.f("ck_donor_profiles_longitude_range"),
        ),
        sa.ForeignKeyConstraint(
            ["district_id"],
            ["districts.id"],
            name=op.f("fk_donor_profiles_district_id_districts"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["local_body_id"],
            ["local_bodies.id"],
            name=op.f("fk_donor_profiles_local_body_id_local_bodies"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_donor_profiles_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_donor_profiles")),
    )
    op.create_index(
        op.f("ix_donor_profiles_district_id"),
        "donor_profiles",
        ["district_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_donor_profiles_local_body_id"),
        "donor_profiles",
        ["local_body_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_donor_profiles_user_id"),
        "donor_profiles",
        ["user_id"],
        unique=True,
    )

    districts_table = sa.table(
        "districts",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
    )
    op.bulk_insert(districts_table, KERALA_DISTRICTS)


def downgrade() -> None:
    op.drop_index(
        op.f("ix_donor_profiles_user_id"),
        table_name="donor_profiles",
    )
    op.drop_index(
        op.f("ix_donor_profiles_local_body_id"),
        table_name="donor_profiles",
    )
    op.drop_index(
        op.f("ix_donor_profiles_district_id"),
        table_name="donor_profiles",
    )
    op.drop_table("donor_profiles")
    op.drop_index(
        op.f("ix_local_bodies_district_id"),
        table_name="local_bodies",
    )
    op.drop_table("local_bodies")
    op.drop_index(op.f("ix_districts_name"), table_name="districts")
    op.drop_index(op.f("ix_districts_code"), table_name="districts")
    op.drop_table("districts")

    op.execute("DROP TYPE IF EXISTS availability_status")
    op.execute("DROP TYPE IF EXISTS blood_group")
    op.execute("DROP TYPE IF EXISTS local_body_type")
