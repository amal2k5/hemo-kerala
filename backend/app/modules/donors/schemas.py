from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.donors.models import AvailabilityStatus, BloodGroup


class LocationRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class DonorProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    blood_group: BloodGroup
    availability_status: AvailabilityStatus = AvailabilityStatus.AVAILABLE
    district_id: int | None = None
    local_body_id: int | None = None
    locality: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class DonorProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    blood_group: BloodGroup | None = None
    availability_status: AvailabilityStatus | None = None
    district_id: int | None = None
    local_body_id: int | None = None
    locality: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class DonorAvailabilityUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    availability_status: AvailabilityStatus


class DonorProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    blood_group: BloodGroup
    availability_status: AvailabilityStatus
    district: LocationRef | None = None
    local_body: LocationRef | None = None
    locality: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    contact_verified: bool
    contact_verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
