from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.modules.responses.schemas import DonorResponseOut, DonorResponseUpdate
from app.modules.responses.service import ResponseService
from app.modules.users.models import User

router = APIRouter(prefix="/requests", tags=["responses"])


def get_response_service(db: Session = Depends(get_db)) -> ResponseService:
    return ResponseService(db)


@router.post(
    "/{request_id}/responses",
    response_model=DonorResponseOut,
    status_code=status.HTTP_201_CREATED,
)
def create_response(
    request_id: int,
    current_user: User = Depends(get_current_user),
    service: ResponseService = Depends(get_response_service),
) -> DonorResponseOut:
    response = service.create(current_user, request_id)
    return DonorResponseOut.from_model(response, current_user.id)


@router.get("/{request_id}/responses", response_model=list[DonorResponseOut])
def list_responses(
    request_id: int,
    current_user: User = Depends(get_current_user),
    service: ResponseService = Depends(get_response_service),
) -> list[DonorResponseOut]:
    responses = service.list_for_request(current_user, request_id)
    return [DonorResponseOut.from_model(item, current_user.id) for item in responses]


@router.patch(
    "/{request_id}/responses/{response_id}",
    response_model=DonorResponseOut,
)
def update_response(
    request_id: int,
    response_id: int,
    response_in: DonorResponseUpdate,
    current_user: User = Depends(get_current_user),
    service: ResponseService = Depends(get_response_service),
) -> DonorResponseOut:
    response = service.update(current_user, request_id, response_id, response_in)
    return DonorResponseOut.from_model(response, current_user.id)
