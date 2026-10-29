from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.responses.models import DonorResponse


class DonorResponseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id_and_request(self, response_id: int, request_id: int) -> DonorResponse | None:
        stmt = select(DonorResponse).where(
            DonorResponse.id == response_id,
            DonorResponse.request_id == request_id,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_request_and_donor(
        self, request_id: int, donor_profile_id: int
    ) -> DonorResponse | None:
        stmt = select(DonorResponse).where(
            DonorResponse.request_id == request_id,
            DonorResponse.donor_profile_id == donor_profile_id,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_by_request(self, request_id: int) -> list[DonorResponse]:
        stmt = (
            select(DonorResponse)
            .where(DonorResponse.request_id == request_id)
            .order_by(DonorResponse.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_by_request_and_donor(
        self, request_id: int, donor_profile_id: int
    ) -> list[DonorResponse]:
        stmt = (
            select(DonorResponse)
            .where(
                DonorResponse.request_id == request_id,
                DonorResponse.donor_profile_id == donor_profile_id,
            )
            .order_by(DonorResponse.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def add(self, response: DonorResponse) -> DonorResponse:
        self.db.add(response)
        self.db.flush()
        return response
