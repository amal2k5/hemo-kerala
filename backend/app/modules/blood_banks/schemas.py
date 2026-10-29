from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.modules.blood_banks.models import BloodBank, VerificationStatus


class DistrictRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class BloodBankOut(BaseModel):
    id: int
    name: str
    address: str | None = None
    locality: str | None = None
    district: DistrictRef
    public_phone: str | None = None
    public_email: str | None = None
    verification_status: VerificationStatus
    verification_date: date | None = None
    source_url: str | None = None
    last_updated_at: datetime

    @classmethod
    def from_model(cls, bank: BloodBank) -> "BloodBankOut":
        return cls(
            id=bank.id,
            name=bank.name,
            address=bank.address,
            locality=bank.locality,
            district=DistrictRef.model_validate(bank.district),
            public_phone=bank.public_phone,
            public_email=bank.public_email,
            verification_status=bank.verification_status,
            verification_date=bank.verification_date,
            source_url=bank.source_url,
            last_updated_at=bank.updated_at,
        )
