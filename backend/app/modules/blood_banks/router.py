from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.blood_banks.models import VerificationStatus
from app.modules.blood_banks.schemas import BloodBankOut
from app.modules.blood_banks.service import BloodBankService

router = APIRouter(prefix="/blood-banks", tags=["blood-banks"])


def get_blood_bank_service(db: Session = Depends(get_db)) -> BloodBankService:
    return BloodBankService(db)


@router.get("", response_model=list[BloodBankOut])
def list_blood_banks(
    district_id: int | None = Query(default=None),
    verification_status: VerificationStatus | None = Query(default=None),
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float | None = Query(default=None, gt=0),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: BloodBankService = Depends(get_blood_bank_service),
) -> list[BloodBankOut]:
    banks = service.list(
        district_id,
        verification_status,
        latitude,
        longitude,
        radius_km,
        limit,
        offset,
    )
    return [BloodBankOut.from_model(bank) for bank in banks]


@router.get("/{bank_id}", response_model=BloodBankOut)
def get_blood_bank(
    bank_id: int,
    service: BloodBankService = Depends(get_blood_bank_service),
) -> BloodBankOut:
    return BloodBankOut.from_model(service.get(bank_id))
