from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.spatial import point_geography
from app.modules.donors.models import AvailabilityStatus, DonorProfile
from app.modules.requests.models import BloodRequest


class DonorMatchRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_candidates(
        self,
        request: BloodRequest,
        radius_km: float,
        limit: int,
        offset: int,
    ) -> list[tuple[DonorProfile, float]]:
        request_point = point_geography(request.latitude, request.longitude)
        distance = func.ST_Distance(DonorProfile.location, request_point)

        stmt = (
            select(DonorProfile, distance.label("distance_m"))
            .where(
                DonorProfile.location.is_not(None),
                DonorProfile.availability_status == AvailabilityStatus.AVAILABLE,
                DonorProfile.blood_group == request.blood_group,
                DonorProfile.user_id != request.requester_id,
                func.ST_DWithin(
                    DonorProfile.location,
                    request_point,
                    radius_km * 1000,
                ),
            )
            .order_by(distance, DonorProfile.id)
            .limit(limit)
            .offset(offset)
        )

        rows = self.db.execute(stmt).all()
        return [(row[0], float(row[1])) for row in rows]
