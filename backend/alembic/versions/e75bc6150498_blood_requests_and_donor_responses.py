"""blood requests and donor responses

Revision ID: e75bc6150498
Revises: 2fa9b633033b
Create Date: 2026-10-29 18:44:19.914091

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e75bc6150498"
down_revision: Union[str, None] = "2fa9b633033b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "blood_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("requester_id", sa.Integer(), nullable=False),
        sa.Column(
            "blood_group",
            postgresql.ENUM(
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-",
                name="blood_group",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "component",
            sa.Enum(
                "whole_blood",
                "packed_red_cells",
                "platelets",
                "plasma",
                "cryoprecipitate",
                name="blood_component",
            ),
            nullable=False,
        ),
        sa.Column("district_id", sa.Integer(), nullable=False),
        sa.Column("locality", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("required_by", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "open",
                "responses_received",
                "coordination_in_progress",
                "partially_fulfilled",
                "fulfilled",
                "cancelled",
                "expired",
                "closed_unfulfilled",
                name="request_status",
            ),
            server_default="open",
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name=op.f("ck_blood_requests_latitude_range"),
        ),
        sa.CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name=op.f("ck_blood_requests_longitude_range"),
        ),
        sa.ForeignKeyConstraint(
            ["district_id"],
            ["districts.id"],
            name=op.f("fk_blood_requests_district_id_districts"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["requester_id"],
            ["users.id"],
            name=op.f("fk_blood_requests_requester_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_blood_requests")),
    )
    op.create_index(
        op.f("ix_blood_requests_district_id"),
        "blood_requests",
        ["district_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_blood_requests_requester_id"),
        "blood_requests",
        ["requester_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_blood_requests_required_by"),
        "blood_requests",
        ["required_by"],
        unique=False,
    )
    op.create_index(
        "ix_blood_requests_status_required_by",
        "blood_requests",
        ["status", "required_by"],
        unique=False,
    )

    op.create_table(
        "donor_responses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("donor_profile_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "accepted",
                "declined",
                "withdrawn",
                name="response_status",
            ),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["donor_profile_id"],
            ["donor_profiles.id"],
            name=op.f("fk_donor_responses_donor_profile_id_donor_profiles"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["request_id"],
            ["blood_requests.id"],
            name=op.f("fk_donor_responses_request_id_blood_requests"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_donor_responses")),
        sa.UniqueConstraint(
            "request_id",
            "donor_profile_id",
            name="uq_donor_responses_request_donor",
        ),
    )
    op.create_index(
        op.f("ix_donor_responses_donor_profile_id"),
        "donor_responses",
        ["donor_profile_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_donor_responses_request_id"),
        "donor_responses",
        ["request_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_donor_responses_request_id"),
        table_name="donor_responses",
    )
    op.drop_index(
        op.f("ix_donor_responses_donor_profile_id"),
        table_name="donor_responses",
    )
    op.drop_table("donor_responses")

    op.drop_index(
        "ix_blood_requests_status_required_by",
        table_name="blood_requests",
    )
    op.drop_index(
        op.f("ix_blood_requests_required_by"),
        table_name="blood_requests",
    )
    op.drop_index(
        op.f("ix_blood_requests_requester_id"),
        table_name="blood_requests",
    )
    op.drop_index(
        op.f("ix_blood_requests_district_id"),
        table_name="blood_requests",
    )
    op.drop_table("blood_requests")

    op.execute("DROP TYPE IF EXISTS response_status")
    op.execute("DROP TYPE IF EXISTS request_status")
    op.execute("DROP TYPE IF EXISTS blood_component")
