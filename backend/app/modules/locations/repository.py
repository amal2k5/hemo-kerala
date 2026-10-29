from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.locations.models import District, LocalBody, LocalBodyType


class LocationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_district(self, district_id: int) -> District | None:
        return self.db.get(District, district_id)

    def get_local_body(self, local_body_id: int) -> LocalBody | None:
        return self.db.get(LocalBody, local_body_id)

    def list_districts(self) -> list[District]:
        stmt = select(District).order_by(District.name)
        return list(self.db.execute(stmt).scalars().all())

    def list_local_bodies(
        self,
        district_id: int | None = None,
        local_body_type: LocalBodyType | None = None,
    ) -> list[LocalBody]:
        stmt = select(LocalBody)
        if district_id is not None:
            stmt = stmt.where(LocalBody.district_id == district_id)
        if local_body_type is not None:
            stmt = stmt.where(LocalBody.type == local_body_type)
        stmt = stmt.order_by(LocalBody.name)
        return list(self.db.execute(stmt).scalars().all())
