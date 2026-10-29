from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationFailedError,
)
from app.modules.locations.repository import LocationRepository
from app.modules.requests.models import (
    ACTIVE_REQUEST_STATUSES,
    OUTCOME_TO_STATUS,
    REQUEST_STATUS_TRANSITIONS,
    BloodRequest,
    RequestStatus,
)
from app.modules.requests.repository import BloodRequestRepository
from app.modules.requests.schemas import BloodRequestCreate, FulfilmentReport
from app.modules.users.models import User


class RequestService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.requests = BloodRequestRepository(db)
        self.locations = LocationRepository(db)

    def create(self, user: User, request_in: BloodRequestCreate) -> BloodRequest:
        if self.locations.get_district(request_in.district_id) is None:
            raise ValidationFailedError("District not found")

        request = BloodRequest(requester_id=user.id, **request_in.model_dump())
        self.requests.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def list_active(self, limit: int, offset: int) -> list[BloodRequest]:
        return self.requests.list_active(limit, offset)

    def get(self, request_id: int) -> BloodRequest:
        request = self.requests.get_by_id(request_id)
        if request is None:
            raise NotFoundError("Blood request not found")
        self._expire_if_needed(request)
        return request

    def cancel(self, user: User, request_id: int) -> BloodRequest:
        request = self.get(request_id)
        self._require_owner(request, user)
        self._transition(request, RequestStatus.CANCELLED)
        self.db.commit()
        self.db.refresh(request)
        return request

    def confirm_fulfilment(
        self, user: User, request_id: int, report: FulfilmentReport
    ) -> BloodRequest:
        request = self.get(request_id)
        self._require_owner(request, user)
        self._transition(request, OUTCOME_TO_STATUS[report.outcome])
        self.db.commit()
        self.db.refresh(request)
        return request

    def _expire_if_needed(self, request: BloodRequest) -> None:
        if request.status in ACTIVE_REQUEST_STATUSES and request.required_by <= datetime.now(UTC):
            self._transition(request, RequestStatus.EXPIRED)
            self.db.commit()
            self.db.refresh(request)

    @staticmethod
    def _require_owner(request: BloodRequest, user: User) -> None:
        if request.requester_id != user.id:
            raise PermissionDeniedError("Only the requester may perform this action")

    @staticmethod
    def _transition(request: BloodRequest, target: RequestStatus) -> None:
        if target not in REQUEST_STATUS_TRANSITIONS[request.status]:
            raise ConflictError(f"Cannot change request status from {request.status} to {target}")
        request.status = target
