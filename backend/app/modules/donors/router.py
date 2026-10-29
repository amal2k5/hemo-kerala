from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.modules.donors.schemas import (
    DonorAvailabilityUpdate,
    DonorProfileCreate,
    DonorProfileOut,
    DonorProfileUpdate,
)
from app.modules.donors.service import DonorService
from app.modules.users.models import User

router = APIRouter(prefix="/donors", tags=["donors"])


def get_donor_service(db: Session = Depends(get_db)) -> DonorService:
    return DonorService(db)


@router.post(
    "/profile",
    response_model=DonorProfileOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create the authenticated user's donor profile",
)
def create_profile(
    profile_in: DonorProfileCreate,
    current_user: User = Depends(get_current_user),
    service: DonorService = Depends(get_donor_service),
) -> DonorProfileOut:
    return service.create_profile(current_user, profile_in)


@router.get("/profile", response_model=DonorProfileOut)
def get_profile(
    current_user: User = Depends(get_current_user),
    service: DonorService = Depends(get_donor_service),
) -> DonorProfileOut:
    return service.get_profile(current_user)


@router.patch("/profile", response_model=DonorProfileOut)
def update_profile(
    profile_in: DonorProfileUpdate,
    current_user: User = Depends(get_current_user),
    service: DonorService = Depends(get_donor_service),
) -> DonorProfileOut:
    return service.update_profile(current_user, profile_in)


@router.patch("/profile/availability", response_model=DonorProfileOut)
def update_availability(
    availability_in: DonorAvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    service: DonorService = Depends(get_donor_service),
) -> DonorProfileOut:
    return service.update_availability(current_user, availability_in)
