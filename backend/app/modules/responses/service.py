from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from app.modules.donors.repository import DonorProfileRepository
from app.modules.requests.models import ACTIVE_REQUEST_STATUSES, RequestStatus
from app.modules.requests.service import RequestService
from app.modules.responses.models import (
    RESPONSE_STATUS_TRANSITIONS,
    DonorResponse,
    ResponseStatus,
)
from app.modules.responses.repository import DonorResponseRepository
from app.modules.responses.schemas import DonorResponseUpdate
from app.modules.users.models import User


class ResponseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.requests = RequestService(db)
        self.responses = DonorResponseRepository(db)
        self.donors = DonorProfileRepository(db)

    def create(self, user: User, request_id: int) -> DonorResponse:
        request = self.requests.get(request_id)

        donor = self.donors.get_by_user_id(user.id)
        if donor is None:
            raise PermissionDeniedError("A donor profile is required to respond")
        if request.requester_id == user.id:
            raise PermissionDeniedError("You cannot respond to your own request")
        if request.status not in ACTIVE_REQUEST_STATUSES:
            raise ConflictError(f"Request is {request.status} and cannot accept responses")

        if self.responses.get_by_request_and_donor(request_id, donor.id) is not None:
            raise ConflictError("You have already responded to this request")

        response = DonorResponse(
            request_id=request_id,
            donor_profile_id=donor.id,
            status=ResponseStatus.PENDING,
        )
        self.responses.add(response)

        if request.status == RequestStatus.OPEN:
            request.status = RequestStatus.RESPONSES_RECEIVED

        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("You have already responded to this request") from exc

        self.db.refresh(response)
        return response

    def list_for_request(self, user: User, request_id: int) -> list[DonorResponse]:
        request = self.requests.get(request_id)

        if request.requester_id == user.id:
            return self.responses.list_by_request(request_id)

        donor = self.donors.get_by_user_id(user.id)
        if donor is None:
            raise PermissionDeniedError("Not allowed to view responses for this request")
        return self.responses.list_by_request_and_donor(request_id, donor.id)

    def update(
        self,
        user: User,
        request_id: int,
        response_id: int,
        response_in: DonorResponseUpdate,
    ) -> DonorResponse:
        request = self.requests.get(request_id)
        response = self.responses.get_by_id_and_request(response_id, request_id)
        if response is None:
            raise NotFoundError("Response not found")
        if response.donor_profile.user_id != user.id:
            raise PermissionDeniedError("Only the responding donor may update this response")

        if response_in.status == response.status:
            return response

        if response_in.status not in RESPONSE_STATUS_TRANSITIONS[response.status]:
            raise ConflictError(
                f"Cannot change response status from {response.status} to {response_in.status}"
            )

        if response_in.status == ResponseStatus.ACCEPTED:
            if request.status not in ACTIVE_REQUEST_STATUSES:
                raise ConflictError(f"Request is {request.status}")
            if request.status in {
                RequestStatus.OPEN,
                RequestStatus.RESPONSES_RECEIVED,
            }:
                request.status = RequestStatus.COORDINATION_IN_PROGRESS

        response.status = response_in.status
        self.db.commit()
        self.db.refresh(response)
        return response
