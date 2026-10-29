from datetime import date
from enum import StrEnum

from geoalchemy2 import Geography
from geoalchemy2.elements import WKBElement
from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Numeric,
    String,
    text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin
from app.modules.locations.models import District


class VerificationStatus(StrEnum):
    VERIFIED = "verified"
    UNVERIFIED = "unverified"
    STALE = "stale"
    UNKNOWN = "unknown"


def _verification_status_enum() -> SAEnum:
    return SAEnum(
        VerificationStatus,
        name="verification_status",
        values_callable=lambda enum: [item.value for item in enum],
    )


class BloodBank(TimestampMixin, Base):
    """Public blood-bank directory entry.

    The directory intentionally stores no stock quantities: stock changes
    constantly and cannot be honestly represented without a live source.
    """

    __tablename__ = "blood_banks"
    __table_args__ = (
        CheckConstraint(
            "verification_status <> 'verified' "
            "OR (verification_date IS NOT NULL AND source_url IS NOT NULL)",
            name="verified_requires_evidence",
        ),
        CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name="latitude_range",
        ),
        CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name="longitude_range",
        ),
        Index("ix_blood_banks_location", "location", postgresql_using="gist"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    locality: Mapped[str | None] = mapped_column(String(255), nullable=True)
    district_id: Mapped[int] = mapped_column(
        ForeignKey("districts.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    public_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    public_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    location: Mapped[WKBElement | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True,
    )

    verification_status: Mapped[VerificationStatus] = mapped_column(
        _verification_status_enum(),
        default=VerificationStatus.UNKNOWN,
        server_default=VerificationStatus.UNKNOWN.value,
        nullable=False,
    )
    verification_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Ops-controlled publication flag. No public write endpoint exists until
    # an administrative role is introduced.
    is_approved: Mapped[bool] = mapped_column(
        default=False,
        server_default=text("false"),
        index=True,
        nullable=False,
    )

    district: Mapped[District] = relationship(lazy="joined")
