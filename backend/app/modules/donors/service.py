from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationFailedError,
)
from app.modules.donors.models import DonorProfile
from app.modules.donors.repository import DonorProfileRepository
from app.modules.donors.schemas import (
    DonorAvailabilityUpdate,
    DonorProfileCreate,
    DonorProfileUpdate,
)
from app.modules.locations.repository import LocationRepository
from app.modules.users.models import User


class DonorService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.profiles = DonorProfileRepository(db)
        self.locations = LocationRepository(db)

    def get_profile(self, user: User) -> DonorProfile:
        profile = self.profiles.get_by_user_id(user.id)
        if profile is None:
            raise NotFoundError("Donor profile not found")
        return profile

    def create_profile(self, user: User, profile_in: DonorProfileCreate) -> DonorProfile:
        if self.profiles.get_by_user_id(user.id) is not None:
            raise ConflictError("Donor profile already exists")

        self._validate_location(profile_in.district_id, profile_in.local_body_id)

        profile = DonorProfile(user_id=user.id, **profile_in.model_dump())
        self.profiles.add(profile)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("Donor profile already exists") from exc

        self.db.refresh(profile)
        return profile

    def update_profile(self, user: User, profile_in: DonorProfileUpdate) -> DonorProfile:
        profile = self.get_profile(user)
        changes = profile_in.model_dump(exclude_unset=True)

        for required_field in ("blood_group", "availability_status"):
            if required_field in changes and changes[required_field] is None:
                raise ValidationFailedError(f"{required_field} cannot be null")

        if "district_id" in changes or "local_body_id" in changes:
            district_id = changes.get("district_id", profile.district_id)
            local_body_id = changes.get("local_body_id", profile.local_body_id)
            self._validate_location(district_id, local_body_id)

        for field, value in changes.items():
            setattr(profile, field, value)

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update_availability(
        self, user: User, availability_in: DonorAvailabilityUpdate
    ) -> DonorProfile:
        profile = self.get_profile(user)
        profile.availability_status = availability_in.availability_status
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def _validate_location(self, district_id: int | None, local_body_id: int | None) -> None:
        if district_id is not None and self.locations.get_district(district_id) is None:
            raise ValidationFailedError("District not found")

        if local_body_id is None:
            return

        local_body = self.locations.get_local_body(local_body_id)
        if local_body is None:
            raise ValidationFailedError("Local body not found")
        if district_id is not None and local_body.district_id != district_id:
            raise ValidationFailedError("Local body does not belong to the selected district")
