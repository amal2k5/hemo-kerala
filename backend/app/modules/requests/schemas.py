from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.donors.models import BloodGroup
from app.modules.requests.models import (
    BloodComponent,
    BloodRequest,
    RequestOutcome,
    RequestStatus,
)


class DistrictRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class BloodRequestCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    blood_group: BloodGroup
    component: BloodComponent
    district_id: int
    locality: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    required_by: datetime

    @field_validator("required_by")
    @classmethod
    def require_future_deadline(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        if value <= datetime.now(UTC):
            raise ValueError("required_by must be in the future")
        return value


class FulfilmentReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    outcome: RequestOutcome


class BloodRequestOut(BaseModel):
    id: int
    blood_group: BloodGroup
    component: BloodComponent
    status: RequestStatus
    district: DistrictRef
    locality: str | None = None
    required_by: datetime
    created_at: datetime
    updated_at: datetime
    is_owner: bool

    @classmethod
    def from_model(cls, request: BloodRequest, current_user_id: int) -> "BloodRequestOut":
        return cls(
            id=request.id,
            blood_group=request.blood_group,
            component=request.component,
            status=request.status,
            district=DistrictRef.model_validate(request.district),
            locality=request.locality,
            required_by=request.required_by,
            created_at=request.created_at,
            updated_at=request.updated_at,
            is_owner=request.requester_id == current_user_id,
        )
