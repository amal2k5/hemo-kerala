from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.locations.models import LocalBodyType
from app.modules.locations.schemas import DistrictOut, LocalBodyOut
from app.modules.locations.service import LocationService

router = APIRouter(prefix="/locations", tags=["locations"])


def get_location_service(db: Session = Depends(get_db)) -> LocationService:
    return LocationService(db)


@router.get("/districts", response_model=list[DistrictOut])
def list_districts(
    service: LocationService = Depends(get_location_service),
) -> list[DistrictOut]:
    return service.list_districts()


@router.get("/local-bodies", response_model=list[LocalBodyOut])
def list_local_bodies(
    district_id: int | None = Query(default=None),
    local_body_type: LocalBodyType | None = Query(default=None, alias="type"),
    service: LocationService = Depends(get_location_service),
) -> list[LocalBodyOut]:
    return service.list_local_bodies(district_id, local_body_type)
