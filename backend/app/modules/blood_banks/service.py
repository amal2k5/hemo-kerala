from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationFailedError
from app.modules.blood_banks.models import BloodBank, VerificationStatus
from app.modules.blood_banks.repository import BloodBankRepository


class BloodBankService:
    def __init__(self, db: Session) -> None:
        self.blood_banks = BloodBankRepository(db)

    def list(
        self,
        district_id: int | None,
        verification_status: VerificationStatus | None,
        latitude: float | None,
        longitude: float | None,
        radius_km: float | None,
        limit: int,
        offset: int,
    ) -> list[BloodBank]:
        if (latitude is None) != (longitude is None):
            raise ValidationFailedError("latitude and longitude must be provided together")

        if latitude is None:
            if radius_km is not None:
                raise ValidationFailedError("radius_km requires latitude and longitude")
        else:
            radius_km = settings.BLOOD_BANK_DEFAULT_RADIUS_KM if radius_km is None else radius_km
            if not 0 < radius_km <= settings.BLOOD_BANK_MAX_RADIUS_KM:
                raise ValidationFailedError(
                    f"radius_km must be greater than 0 and at most "
                    f"{settings.BLOOD_BANK_MAX_RADIUS_KM:g}"
                )

        return self.blood_banks.list_approved(
            district_id,
            verification_status,
            latitude,
            longitude,
            radius_km,
            limit,
            offset,
        )

    def get(self, bank_id: int) -> BloodBank:
        bank = self.blood_banks.get_approved(bank_id)
        if bank is None:
            raise NotFoundError("Blood bank not found")
        return bank
