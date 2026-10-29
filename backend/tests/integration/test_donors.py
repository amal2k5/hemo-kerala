import pytest

from app.modules.locations.models import District, LocalBody, LocalBodyType

PASSWORD = "secret123"


def _auth_headers(client, email: str) -> dict[str, str]:
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "full_name": "Donor User"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_profile(client, headers, district_id=None, **overrides):
    payload = {"blood_group": "O+"}
    if district_id is not None:
        payload["district_id"] = district_id
    payload.update(overrides)
    return client.post("/api/v1/donors/profile", json=payload, headers=headers)


@pytest.fixture
def district(db_session) -> District:
    return db_session.query(District).filter(District.code == "palakkad").one()


@pytest.fixture
def auth_headers(client) -> dict[str, str]:
    return _auth_headers(client, "donor@example.com")


def test_create_donor_profile(client, auth_headers, district):
    response = _create_profile(client, auth_headers, district.id, locality="Nemmara")

    assert response.status_code == 201
    body = response.json()
    assert body["blood_group"] == "O+"
    assert body["availability_status"] == "available"
    assert body["district"] == {"id": district.id, "name": "Palakkad"}
    assert body["local_body"] is None
    assert body["locality"] == "Nemmara"
    assert body["contact_verified"] is False
    assert body["contact_verified_at"] is None
    assert "created_at" in body
    assert "updated_at" in body


def test_get_own_profile(client, auth_headers, district):
    _create_profile(client, auth_headers, district.id)

    response = client.get("/api/v1/donors/profile", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["district"]["name"] == "Palakkad"


def test_partial_update_preserves_omitted_fields(client, auth_headers, district):
    _create_profile(client, auth_headers, district.id, locality="Nemmara")

    response = client.patch(
        "/api/v1/donors/profile",
        json={"locality": "Ottapalam"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["locality"] == "Ottapalam"
    assert body["blood_group"] == "O+"
    assert body["district"]["id"] == district.id


def test_invalid_blood_group_rejected(client, auth_headers):
    response = _create_profile(client, auth_headers, blood_group="C+")

    assert response.status_code == 422


def test_invalid_availability_status_rejected(client, auth_headers, district):
    _create_profile(client, auth_headers, district.id)

    response = client.patch(
        "/api/v1/donors/profile/availability",
        json={"availability_status": "sleeping"},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_profile_without_location_data(client, auth_headers):
    response = _create_profile(client, auth_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["district"] is None
    assert body["local_body"] is None
    assert body["locality"] is None
    assert body["latitude"] is None
    assert body["longitude"] is None


def test_optional_location_can_be_cleared(client, auth_headers, district):
    _create_profile(client, auth_headers, district.id, locality="Nemmara")

    response = client.patch(
        "/api/v1/donors/profile",
        json={"district_id": None, "locality": None},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["district"] is None
    assert response.json()["locality"] is None


def test_donor_endpoints_require_authentication(client):
    assert client.get("/api/v1/donors/profile").status_code == 401
    assert client.post("/api/v1/donors/profile", json={"blood_group": "O+"}).status_code == 401
    assert client.patch("/api/v1/donors/profile", json={"locality": "Nemmara"}).status_code == 401
    assert (
        client.patch(
            "/api/v1/donors/profile/availability",
            json={"availability_status": "paused"},
        ).status_code
        == 401
    )


def test_cannot_access_another_users_profile(client, district):
    owner_headers = _auth_headers(client, "owner@example.com")
    other_headers = _auth_headers(client, "other@example.com")
    _create_profile(client, owner_headers, district.id, locality="Nemmara")

    assert client.get("/api/v1/donors/profile", headers=other_headers).status_code == 404
    assert (
        client.patch(
            "/api/v1/donors/profile",
            json={"locality": "Hijacked"},
            headers=other_headers,
        ).status_code
        == 404
    )

    owner_profile = client.get("/api/v1/donors/profile", headers=owner_headers).json()
    assert owner_profile["locality"] == "Nemmara"


def test_client_supplied_user_id_is_rejected(client, auth_headers, district):
    _create_profile(client, auth_headers, district.id)

    response = client.patch(
        "/api/v1/donors/profile",
        json={"user_id": 9999},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_availability_can_be_paused_and_withdrawn(client, auth_headers, district):
    _create_profile(client, auth_headers, district.id)

    paused = client.patch(
        "/api/v1/donors/profile/availability",
        json={"availability_status": "paused"},
        headers=auth_headers,
    )
    assert paused.status_code == 200
    assert paused.json()["availability_status"] == "paused"

    withdrawn = client.patch(
        "/api/v1/donors/profile/availability",
        json={"availability_status": "withdrawn"},
        headers=auth_headers,
    )
    assert withdrawn.status_code == 200
    assert withdrawn.json()["availability_status"] == "withdrawn"

    refreshed = client.get("/api/v1/donors/profile", headers=auth_headers)
    assert refreshed.json()["availability_status"] == "withdrawn"


def test_duplicate_profile_rejected(client, auth_headers, district):
    first = _create_profile(client, auth_headers, district.id)
    second = _create_profile(client, auth_headers, district.id)

    assert first.status_code == 201
    assert second.status_code == 409


def test_local_body_must_belong_to_district(client, auth_headers, district, db_session):
    other_district = db_session.query(District).filter(District.code == "ernakulam").one()
    local_body = LocalBody(
        district_id=other_district.id,
        type=LocalBodyType.MUNICIPALITY,
        name="Kochi",
    )
    db_session.add(local_body)
    db_session.flush()

    response = _create_profile(
        client,
        auth_headers,
        district.id,
        local_body_id=local_body.id,
    )

    assert response.status_code == 422


def test_private_fields_not_exposed(client, auth_headers, district):
    _create_profile(client, auth_headers, district.id)

    body = client.get("/api/v1/donors/profile", headers=auth_headers).json()

    assert "email" not in body
    assert "phone_number" not in body
    assert "hashed_password" not in body
    assert "user_id" not in body


def test_location_reference_data(client):
    districts = client.get("/api/v1/locations/districts")
    assert districts.status_code == 200
    assert len(districts.json()) == 14

    local_bodies = client.get(
        "/api/v1/locations/local-bodies",
        params={"district_id": districts.json()[0]["id"]},
    )
    assert local_bodies.status_code == 200
    assert local_bodies.json() == []
