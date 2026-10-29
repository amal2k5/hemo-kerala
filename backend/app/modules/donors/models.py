from datetime import datetime
from enum import StrEnum

from geoalchemy2 import Geography
from geoalchemy2.elements import WKBElement
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin
from app.modules.locations.models import District, LocalBody
from app.modules.users.models import User


class BloodGroup(StrEnum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


class AvailabilityStatus(StrEnum):
    AVAILABLE = "available"
    PAUSED = "paused"
    WITHDRAWN = "withdrawn"


def _blood_group_enum() -> SAEnum:
    return SAEnum(
        BloodGroup,
        name="blood_group",
        values_callable=lambda enum: [item.value for item in enum],
    )


def _availability_status_enum() -> SAEnum:
    return SAEnum(
        AvailabilityStatus,
        name="availability_status",
        values_callable=lambda enum: [item.value for item in enum],
    )


class DonorProfile(TimestampMixin, Base):
    """A user's voluntary donor profile.

    This stores self-reported, non-clinical information only. ``contact_verified``
    never implies medical eligibility or clinical blood compatibility.
    """

    __tablename__ = "donor_profiles"
    __table_args__ = (
        CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name="latitude_range",
        ),
        CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name="longitude_range",
        ),
        Index("ix_donor_profiles_location", "location", postgresql_using="gist"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    blood_group: Mapped[BloodGroup] = mapped_column(_blood_group_enum(), nullable=False)
    availability_status: Mapped[AvailabilityStatus] = mapped_column(
        _availability_status_enum(),
        default=AvailabilityStatus.AVAILABLE,
        server_default=AvailabilityStatus.AVAILABLE.value,
        nullable=False,
    )

    # Optional service area. Administrative geography is not a distance.
    district_id: Mapped[int | None] = mapped_column(
        ForeignKey("districts.id", ondelete="SET NULL"), index=True, nullable=True
    )
    local_body_id: Mapped[int | None] = mapped_column(
        ForeignKey("local_bodies.id", ondelete="SET NULL"), index=True, nullable=True
    )
    locality: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Optional approximate coordinates, never exposed outside the owner's profile.
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)

    # Derived from latitude/longitude at write time. Used only for indexed,
    # database-side distance filtering; it is never exposed through the API.
    location: Mapped[WKBElement | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True,
    )

    # Contact verification is separate from medical eligibility.
    contact_verified: Mapped[bool] = mapped_column(
        default=False, server_default=text("false"), nullable=False
    )
    contact_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[User] = relationship()
    district: Mapped[District | None] = relationship(lazy="joined")
    local_body: Mapped[LocalBody | None] = relationship(lazy="joined")
