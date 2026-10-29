from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.donors.models import DonorProfile


class DonorProfileRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_user_id(self, user_id: int) -> DonorProfile | None:
        stmt = select(DonorProfile).where(DonorProfile.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def add(self, profile: DonorProfile) -> DonorProfile:
        self.db.add(profile)
        self.db.flush()
        return profile
