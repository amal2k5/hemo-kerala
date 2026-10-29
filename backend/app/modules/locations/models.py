from enum import StrEnum

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LocalBodyType(StrEnum):
    GRAMA_PANCHAYAT = "grama_panchayat"
    MUNICIPALITY = "municipality"
    CORPORATION = "corporation"


def _local_body_type_enum() -> SAEnum:
    return SAEnum(
        LocalBodyType,
        name="local_body_type",
        values_callable=lambda enum: [item.value for item in enum],
    )


class District(Base):
    """Kerala district reference data.

    ``code`` is a stable internal slug, not an official government code.
    """

    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)


class LocalBody(Base):
    """Grama panchayat, municipality, or corporation within a district.

    Administrative geography is intentionally separate from physical distance.
    """

    __tablename__ = "local_bodies"
    __table_args__ = (
        UniqueConstraint(
            "district_id",
            "type",
            "name",
            name="uq_local_bodies_district_type_name",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    district_id: Mapped[int] = mapped_column(
        ForeignKey("districts.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[LocalBodyType] = mapped_column(_local_body_type_enum(), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
