from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.modules.matching.schemas import MatchCandidateOut
from app.modules.matching.service import MatchingService
from app.modules.users.models import User

router = APIRouter(prefix="/requests", tags=["matching"])


def get_matching_service(db: Session = Depends(get_db)) -> MatchingService:
    return MatchingService(db)


@router.get(
    "/{request_id}/matches",
    response_model=list[MatchCandidateOut],
    summary="Find opted-in donors near a request (owner only)",
)
def list_matches(
    request_id: int,
    radius_km: float = Query(
        default=settings.DONOR_MATCH_DEFAULT_RADIUS_KM,
        gt=0,
        le=settings.DONOR_MATCH_MAX_RADIUS_KM,
    ),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    service: MatchingService = Depends(get_matching_service),
) -> list[MatchCandidateOut]:
    candidates = service.find_candidates(current_user, request_id, radius_km, limit, offset)
    return [MatchCandidateOut.from_match(donor, distance_m) for donor, distance_m in candidates]
