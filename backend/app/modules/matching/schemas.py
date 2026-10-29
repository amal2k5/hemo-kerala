from pydantic import BaseModel, ConfigDict

from app.modules.donors.models import AvailabilityStatus, BloodGroup, DonorProfile


class DistrictRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class MatchCandidateOut(BaseModel):
    """Coordination-safe view of a donor candidate.

    Deliberately omits name, phone, email, user id, and precise coordinates.
    ``distance_km`` is rounded so it cannot be used to recover a location.
    """

    donor_profile_id: int
    blood_group: BloodGroup
    availability_status: AvailabilityStatus
    district: DistrictRef | None = None
    locality: str | None = None
    distance_km: float
    contact_verified: bool

    @classmethod
    def from_match(cls, donor: DonorProfile, distance_m: float) -> "MatchCandidateOut":
        return cls(
            donor_profile_id=donor.id,
            blood_group=donor.blood_group,
            availability_status=donor.availability_status,
            district=(
                DistrictRef.model_validate(donor.district) if donor.district is not None else None
            ),
            locality=donor.locality,
            distance_km=round(distance_m / 1000, 2),
            contact_verified=donor.contact_verified,
        )
