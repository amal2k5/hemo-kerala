from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.modules.requests.schemas import (
    BloodRequestCreate,
    BloodRequestOut,
    FulfilmentReport,
)
from app.modules.requests.service import RequestService
from app.modules.users.models import User

router = APIRouter(prefix="/requests", tags=["requests"])


def get_request_service(db: Session = Depends(get_db)) -> RequestService:
    return RequestService(db)


@router.post("", response_model=BloodRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    request_in: BloodRequestCreate,
    current_user: User = Depends(get_current_user),
    service: RequestService = Depends(get_request_service),
) -> BloodRequestOut:
    request = service.create(current_user, request_in)
    return BloodRequestOut.from_model(request, current_user.id)


@router.get("", response_model=list[BloodRequestOut])
def list_active_requests(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    service: RequestService = Depends(get_request_service),
) -> list[BloodRequestOut]:
    requests = service.list_active(limit, offset)
    return [BloodRequestOut.from_model(item, current_user.id) for item in requests]


@router.get("/{request_id}", response_model=BloodRequestOut)
def get_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    service: RequestService = Depends(get_request_service),
) -> BloodRequestOut:
    request = service.get(request_id)
    return BloodRequestOut.from_model(request, current_user.id)


@router.post("/{request_id}/cancel", response_model=BloodRequestOut)
def cancel_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    service: RequestService = Depends(get_request_service),
) -> BloodRequestOut:
    request = service.cancel(current_user, request_id)
    return BloodRequestOut.from_model(request, current_user.id)


@router.post("/{request_id}/confirm-fulfilment", response_model=BloodRequestOut)
def confirm_fulfilment(
    request_id: int,
    report: FulfilmentReport,
    current_user: User = Depends(get_current_user),
    service: RequestService = Depends(get_request_service),
) -> BloodRequestOut:
    request = service.confirm_fulfilment(current_user, request_id, report)
    return BloodRequestOut.from_model(request, current_user.id)
