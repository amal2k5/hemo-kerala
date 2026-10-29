from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin
from app.modules.donors.models import BloodGroup
from app.modules.locations.models import District


class BloodComponent(StrEnum):
    WHOLE_BLOOD = "whole_blood"
    PACKED_RED_CELLS = "packed_red_cells"
    PLATELETS = "platelets"
    PLASMA = "plasma"
    CRYOPRECIPITATE = "cryoprecipitate"


class RequestStatus(StrEnum):
    OPEN = "open"
    RESPONSES_RECEIVED = "responses_received"
    COORDINATION_IN_PROGRESS = "coordination_in_progress"
    PARTIALLY_FULFILLED = "partially_fulfilled"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    CLOSED_UNFULFILLED = "closed_unfulfilled"


class RequestOutcome(StrEnum):
    FULFILLED = "fulfilled"
    PARTIALLY_FULFILLED = "partially_fulfilled"
    CLOSED_UNFULFILLED = "closed_unfulfilled"


ACTIVE_REQUEST_STATUSES = frozenset(
    {
        RequestStatus.OPEN,
        RequestStatus.RESPONSES_RECEIVED,
        RequestStatus.COORDINATION_IN_PROGRESS,
    }
)

# Terminal states never transition back to an active state.
REQUEST_STATUS_TRANSITIONS: dict[RequestStatus, frozenset[RequestStatus]] = {
    RequestStatus.OPEN: frozenset(
        {
            RequestStatus.RESPONSES_RECEIVED,
            RequestStatus.CANCELLED,
            RequestStatus.EXPIRED,
            RequestStatus.FULFILLED,
            RequestStatus.PARTIALLY_FULFILLED,
            RequestStatus.CLOSED_UNFULFILLED,
        }
    ),
    RequestStatus.RESPONSES_RECEIVED: frozenset(
        {
            RequestStatus.COORDINATION_IN_PROGRESS,
            RequestStatus.CANCELLED,
            RequestStatus.EXPIRED,
            RequestStatus.FULFILLED,
            RequestStatus.PARTIALLY_FULFILLED,
            RequestStatus.CLOSED_UNFULFILLED,
        }
    ),
    RequestStatus.COORDINATION_IN_PROGRESS: frozenset(
        {
            RequestStatus.CANCELLED,
            RequestStatus.EXPIRED,
            RequestStatus.FULFILLED,
            RequestStatus.PARTIALLY_FULFILLED,
            RequestStatus.CLOSED_UNFULFILLED,
        }
    ),
    RequestStatus.PARTIALLY_FULFILLED: frozenset(),
    RequestStatus.FULFILLED: frozenset(),
    RequestStatus.CANCELLED: frozenset(),
    RequestStatus.EXPIRED: frozenset(),
    RequestStatus.CLOSED_UNFULFILLED: frozenset(),
}

OUTCOME_TO_STATUS: dict[RequestOutcome, RequestStatus] = {
    RequestOutcome.FULFILLED: RequestStatus.FULFILLED,
    RequestOutcome.PARTIALLY_FULFILLED: RequestStatus.PARTIALLY_FULFILLED,
    RequestOutcome.CLOSED_UNFULFILLED: RequestStatus.CLOSED_UNFULFILLED,
}


def _request_status_enum() -> SAEnum:
    return SAEnum(
        RequestStatus,
        name="request_status",
        values_callable=lambda enum: [item.value for item in enum],
    )


def _blood_component_enum() -> SAEnum:
    return SAEnum(
        BloodComponent,
        name="blood_component",
        values_callable=lambda enum: [item.value for item in enum],
    )


def _blood_group_enum() -> PgEnum:
    # Reuse the ``blood_group`` type created for donor profiles.
    return PgEnum(
        BloodGroup,
        name="blood_group",
        create_type=False,
        values_callable=lambda enum: [item.value for item in enum],
    )


class BloodRequest(TimestampMixin, Base):
    __tablename__ = "blood_requests"
    __table_args__ = (
        CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name="latitude_range",
        ),
        CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name="longitude_range",
        ),
        Index("ix_blood_requests_status_required_by", "status", "required_by"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    blood_group: Mapped[BloodGroup] = mapped_column(_blood_group_enum(), nullable=False)
    component: Mapped[BloodComponent] = mapped_column(_blood_component_enum(), nullable=False)
    district_id: Mapped[int] = mapped_column(
        ForeignKey("districts.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    locality: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    required_by: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    status: Mapped[RequestStatus] = mapped_column(
        _request_status_enum(),
        default=RequestStatus.OPEN,
        server_default=RequestStatus.OPEN.value,
        nullable=False,
    )

    district: Mapped[District] = relationship(lazy="joined")
