from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.modules.responses.models import DonorResponse, ResponseStatus


class DonorResponseUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ResponseStatus


class DonorResponseOut(BaseModel):
    id: int
    request_id: int
    status: ResponseStatus
    created_at: datetime
    updated_at: datetime
    is_owner: bool

    @classmethod
    def from_model(cls, response: DonorResponse, current_user_id: int) -> "DonorResponseOut":
        return cls(
            id=response.id,
            request_id=response.request_id,
            status=response.status,
            created_at=response.created_at,
            updated_at=response.updated_at,
            is_owner=response.donor_profile.user_id == current_user_id,
        )
