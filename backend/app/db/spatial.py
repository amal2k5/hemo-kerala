from decimal import Decimal

from geoalchemy2 import Geography
from sqlalchemy import func
from sqlalchemy.sql.elements import ColumnElement

GEOGRAPHY_POINT = Geography(geometry_type="POINT", srid=4326)


def point_geography(
    latitude: float | Decimal | None,
    longitude: float | Decimal | None,
) -> ColumnElement | None:
    """Build a PostGIS geography point from validated coordinates.

    Returns ``None`` when either coordinate is missing so a missing location is
    stored as SQL NULL rather than being fabricated from district/locality.
    """

    if latitude is None or longitude is None:
        return None
    return func.ST_SetSRID(func.ST_MakePoint(float(longitude), float(latitude)), 4326).cast(
        GEOGRAPHY_POINT
    )
