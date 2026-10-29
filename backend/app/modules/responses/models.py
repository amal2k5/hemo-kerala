from enum import StrEnum

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin
from app.modules.donors.models import DonorProfile
from app.modules.requests.models import BloodRequest


class ResponseStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"


RESPONSE_STATUS_TRANSITIONS: dict[ResponseStatus, frozenset[ResponseStatus]] = {
    ResponseStatus.PENDING: frozenset(
        {
            ResponseStatus.ACCEPTED,
            ResponseStatus.DECLINED,
            ResponseStatus.WITHDRAWN,
        }
    ),
    ResponseStatus.ACCEPTED: frozenset({ResponseStatus.WITHDRAWN}),
    ResponseStatus.DECLINED: frozenset(),
    ResponseStatus.WITHDRAWN: frozenset(),
}


def _response_status_enum() -> SAEnum:
    return SAEnum(
        ResponseStatus,
        name="response_status",
        values_callable=lambda enum: [item.value for item in enum],
    )


class DonorResponse(TimestampMixin, Base):
    """A donor's offer of help for a specific blood request."""

    __tablename__ = "donor_responses"
    __table_args__ = (
        UniqueConstraint(
            "request_id",
            "donor_profile_id",
            name="uq_donor_responses_request_donor",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("blood_requests.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    donor_profile_id: Mapped[int] = mapped_column(
        ForeignKey("donor_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[ResponseStatus] = mapped_column(
        _response_status_enum(),
        default=ResponseStatus.PENDING,
        server_default=ResponseStatus.PENDING.value,
        nullable=False,
    )

    request: Mapped[BloodRequest] = relationship()
    donor_profile: Mapped[DonorProfile] = relationship(lazy="joined")
