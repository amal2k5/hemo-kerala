from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    ConflictError,
    PermissionDeniedError,
    ValidationFailedError,
)
from app.modules.donors.models import DonorProfile
from app.modules.matching.repository import DonorMatchRepository
from app.modules.requests.models import ACTIVE_REQUEST_STATUSES
from app.modules.requests.service import RequestService
from app.modules.users.models import User


class MatchingService:
    """Deterministic, database-side candidate search.

    Matching is advisory: it never changes request status, never notifies
    donors, and never implies clinical compatibility.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self.requests = RequestService(db)
        self.matches = DonorMatchRepository(db)

    def find_candidates(
        self,
        user: User,
        request_id: int,
        radius_km: float,
        limit: int,
        offset: int,
    ) -> list[tuple[DonorProfile, float]]:
        request = self.requests.get(request_id)

        if request.requester_id != user.id:
            raise PermissionDeniedError("Only the requester may view matches")
        if request.status not in ACTIVE_REQUEST_STATUSES:
            raise ConflictError(f"Request is {request.status} and cannot be matched")
        if request.location is None:
            raise ValidationFailedError(
                "Blood request has no coordinates; matching requires a location"
            )
        if not 0 < radius_km <= settings.DONOR_MATCH_MAX_RADIUS_KM:
            raise ValidationFailedError(
                f"radius_km must be greater than 0 and at most "
                f"{settings.DONOR_MATCH_MAX_RADIUS_KM:g}"
            )

        return self.matches.find_candidates(request, radius_km, limit, offset)
