from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.requests.models import ACTIVE_REQUEST_STATUSES, BloodRequest


class BloodRequestRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, request_id: int) -> BloodRequest | None:
        return self.db.get(BloodRequest, request_id)

    def add(self, request: BloodRequest) -> BloodRequest:
        self.db.add(request)
        self.db.flush()
        return request

    def list_active(self, limit: int, offset: int) -> list[BloodRequest]:
        stmt = (
            select(BloodRequest)
            .where(
                BloodRequest.status.in_(ACTIVE_REQUEST_STATUSES),
                BloodRequest.required_by > datetime.now(UTC),
            )
            .order_by(BloodRequest.required_by)
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())
