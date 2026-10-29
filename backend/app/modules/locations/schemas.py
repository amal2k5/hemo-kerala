from pydantic import BaseModel, ConfigDict

from app.modules.locations.models import LocalBodyType


class DistrictOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str


class LocalBodyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    district_id: int
    type: LocalBodyType
    name: str
