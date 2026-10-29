from sqlalchemy.orm import Session

from app.modules.locations.models import District, LocalBody, LocalBodyType
from app.modules.locations.repository import LocationRepository


class LocationService:
    def __init__(self, db: Session) -> None:
        self.locations = LocationRepository(db)

    def list_districts(self) -> list[District]:
        return self.locations.list_districts()

    def list_local_bodies(
        self,
        district_id: int | None = None,
        local_body_type: LocalBodyType | None = None,
    ) -> list[LocalBody]:
        return self.locations.list_local_bodies(district_id, local_body_type)
