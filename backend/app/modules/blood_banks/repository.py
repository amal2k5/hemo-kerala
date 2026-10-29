from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.spatial import point_geography
from app.modules.blood_banks.models import BloodBank, VerificationStatus


class BloodBankRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_approved(self, bank_id: int) -> BloodBank | None:
        stmt = select(BloodBank).where(
            BloodBank.id == bank_id,
            BloodBank.is_approved.is_(True),
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_approved(
        self,
        district_id: int | None,
        verification_status: VerificationStatus | None,
        latitude: float | None,
        longitude: float | None,
        radius_km: float | None,
        limit: int,
        offset: int,
    ) -> list[BloodBank]:
        stmt = select(BloodBank).where(BloodBank.is_approved.is_(True))

        if district_id is not None:
            stmt = stmt.where(BloodBank.district_id == district_id)
        if verification_status is not None:
            stmt = stmt.where(BloodBank.verification_status == verification_status)

        if latitude is not None and longitude is not None:
            point = point_geography(latitude, longitude)
            distance = func.ST_Distance(BloodBank.location, point)
            stmt = stmt.where(
                BloodBank.location.is_not(None),
                func.ST_DWithin(BloodBank.location, point, radius_km * 1000),
            ).order_by(distance, BloodBank.name, BloodBank.id)
        else:
            stmt = stmt.order_by(BloodBank.name, BloodBank.id)

        stmt = stmt.limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars().all())
