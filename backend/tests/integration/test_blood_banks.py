from datetime import date, datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.spatial import point_geography
from app.modules.blood_banks.models import BloodBank, VerificationStatus
from app.modules.locations.models import District

PALAKKAD_LAT = 10.7867
PALAKKAD_LON = 76.6548
FAR_LAT = 11.2588  # Kozhikode, roughly 60 km away


@pytest.fixture
def district(db_session) -> District:
    return db_session.query(District).filter(District.code == "palakkad").one()


@pytest.fixture
def other_district(db_session) -> District:
    return db_session.query(District).filter(District.code == "ernakulam").one()


def make_bank(db_session, district, name: str = "Test Blood Bank", **overrides) -> BloodBank:
    latitude = overrides.pop("latitude", PALAKKAD_LAT)
    longitude = overrides.pop("longitude", PALAKKAD_LON)
    data = {
        "name": name,
        "address": "Main Road",
        "locality": "Palakkad",
        "district_id": district.id,
        "public_phone": "+91-0000000000",
        "verification_status": VerificationStatus.UNVERIFIED,
        "is_approved": True,
    }
    data.update(overrides)
    bank = BloodBank(latitude=latitude, longitude=longitude, **data)
    bank.location = point_geography(latitude, longitude)
    db_session.add(bank)
    db_session.commit()
    db_session.refresh(bank)
    return bank


def test_public_directory_lists_approved_banks(client, db_session, district):
    bank = make_bank(db_session, district, name="Palakkad District Hospital Blood Bank")

    response = client.get("/api/v1/blood-banks")

    assert response.status_code == 200
    assert len(response.json()) == 1
    body = response.json()[0]
    assert body["id"] == bank.id
    assert body["name"] == "Palakkad District Hospital Blood Bank"
    assert body["district"] == {"id": district.id, "name": "Palakkad"}
    assert body["verification_status"] == "unverified"
    assert body["verification_date"] is None
    assert body["source_url"] is None
    assert "last_updated_at" in body
    assert "is_approved" not in body
    assert "latitude" not in body
    assert "longitude" not in body


def test_directory_filters_by_district(client, db_session, district, other_district):
    make_bank(db_session, district, name="Palakkad Bank")
    make_bank(db_session, other_district, name="Ernakulam Bank")

    response = client.get("/api/v1/blood-banks", params={"district_id": district.id})

    assert response.status_code == 200
    names = [item["name"] for item in response.json()]
    assert names == ["Palakkad Bank"]


def test_unapproved_records_are_hidden(client, db_session, district):
    approved = make_bank(db_session, district, name="Approved Bank")
    hidden = make_bank(db_session, district, name="Hidden Bank", is_approved=False)

    listing = client.get("/api/v1/blood-banks")
    detail = client.get(f"/api/v1/blood-banks/{hidden.id}")

    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()] == [approved.id]
    assert detail.status_code == 404


def test_verified_status_requires_evidence(db_session, district):
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            bank = BloodBank(
                name="Unsupported Verification",
                district_id=district.id,
                verification_status=VerificationStatus.VERIFIED,
                is_approved=True,
            )
            db_session.add(bank)
            db_session.flush()


def test_verified_status_with_source_is_accepted(client, db_session, district):
    make_bank(
        db_session,
        district,
        name="Verified Bank",
        verification_status=VerificationStatus.VERIFIED,
        verification_date=date(2026, 10, 1),
        source_url="https://example.gov.in/blood-banks",
    )

    response = client.get("/api/v1/blood-banks")

    assert response.status_code == 200
    body = response.json()[0]
    assert body["verification_status"] == "verified"
    assert body["verification_date"] == "2026-10-01"
    assert body["source_url"] == "https://example.gov.in/blood-banks"


def test_stale_and_unknown_are_reported_honestly(client, db_session, district):
    make_bank(
        db_session,
        district,
        name="Stale Bank",
        verification_status=VerificationStatus.STALE,
        verification_date=date(2024, 1, 1),
    )
    make_bank(
        db_session,
        district,
        name="Unknown Bank",
        verification_status=VerificationStatus.UNKNOWN,
    )

    response = client.get("/api/v1/blood-banks")

    assert response.status_code == 200
    by_name = {item["name"]: item for item in response.json()}
    assert by_name["Stale Bank"]["verification_status"] == "stale"
    assert by_name["Stale Bank"]["verification_date"] == "2024-01-01"
    assert by_name["Stale Bank"]["source_url"] is None
    assert by_name["Unknown Bank"]["verification_status"] == "unknown"
    assert by_name["Unknown Bank"]["verification_date"] is None


def test_directory_location_search(client, db_session, district):
    make_bank(db_session, district, name="Near Bank", latitude=PALAKKAD_LAT, longitude=PALAKKAD_LON)
    make_bank(db_session, district, name="Far Bank", latitude=FAR_LAT, longitude=PALAKKAD_LON)

    response = client.get(
        "/api/v1/blood-banks",
        params={"latitude": PALAKKAD_LAT, "longitude": PALAKKAD_LON, "radius_km": 5},
    )

    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == ["Near Bank"]


def test_directory_location_filter_validation(client):
    missing_pair = client.get("/api/v1/blood-banks", params={"latitude": PALAKKAD_LAT})
    excessive = client.get(
        "/api/v1/blood-banks",
        params={"latitude": PALAKKAD_LAT, "longitude": PALAKKAD_LON, "radius_km": 101},
    )

    assert missing_pair.status_code == 422
    assert excessive.status_code == 422


def test_unauthorized_modifications_are_rejected(client, db_session, district):
    bank = make_bank(db_session, district, name="Immutable Bank")

    create = client.post("/api/v1/blood-banks", json={"name": "Injected"})
    update = client.patch(f"/api/v1/blood-banks/{bank.id}", json={"name": "Changed"})
    delete = client.delete(f"/api/v1/blood-banks/{bank.id}")

    assert create.status_code == 405
    assert update.status_code == 405
    assert delete.status_code == 405
    db_session.expire_all()
    assert db_session.get(BloodBank, bank.id).name == "Immutable Bank"


def test_detail_is_public_and_returns_freshness(client, db_session, district):
    bank = make_bank(db_session, district, name="Detail Bank")

    response = client.get(f"/api/v1/blood-banks/{bank.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Detail Bank"
    assert datetime.fromisoformat(body["last_updated_at"]).tzinfo is not None
    assert "created_at" not in body


def test_missing_bank_returns_404(client):
    response = client.get("/api/v1/blood-banks/999999")

    assert response.status_code == 404
