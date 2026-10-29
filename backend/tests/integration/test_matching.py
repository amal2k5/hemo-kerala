import pytest

from app.modules.locations.models import District
from app.modules.requests.models import BloodRequest, RequestStatus
from app.modules.responses.models import DonorResponse
from tests.integration.factories import (
    auth_headers,
    create_donor_profile,
    create_request,
)

# Palakkad town. Offsets of 0.01 degrees latitude are roughly 1.1 km.
REQUEST_LAT = 10.7867
REQUEST_LON = 76.6548
NEAR_LAT = 10.7967
FAR_LAT = 10.8267


@pytest.fixture
def district(db_session) -> District:
    return db_session.query(District).filter(District.code == "palakkad").one()


@pytest.fixture
def requester_headers(client) -> dict[str, str]:
    return auth_headers(client, "match-requester@example.com")


@pytest.fixture
def other_headers(client) -> dict[str, str]:
    return auth_headers(client, "match-other@example.com")


def _request_with_location(client, headers, district_id, **overrides):
    return create_request(
        client,
        headers,
        district_id,
        latitude=REQUEST_LAT,
        longitude=REQUEST_LON,
        **overrides,
    )


def _available_donor(client, email, district_id, latitude, longitude, **overrides):
    headers = auth_headers(client, email)
    response = create_donor_profile(
        client,
        headers,
        district_id,
        latitude=latitude,
        longitude=longitude,
        **overrides,
    )
    assert response.status_code == 201
    return headers


def test_matching_returns_available_donor_within_radius(client, requester_headers, district):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]
    _available_donor(client, "match-near@example.com", district.id, NEAR_LAT, REQUEST_LON)

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 2},
        headers=requester_headers,
    )

    assert response.status_code == 200
    candidates = response.json()
    assert len(candidates) == 1
    candidate = candidates[0]
    assert candidate["blood_group"] == "O+"
    assert candidate["availability_status"] == "available"
    assert candidate["district"]["name"] == "Palakkad"
    assert 1.0 < candidate["distance_km"] < 1.3


def test_unavailable_and_withdrawn_donors_are_excluded(client, requester_headers, district):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]
    paused = _available_donor(
        client, "match-paused@example.com", district.id, NEAR_LAT, REQUEST_LON
    )
    client.patch(
        "/api/v1/donors/profile/availability",
        json={"availability_status": "paused"},
        headers=paused,
    )
    withdrawn = _available_donor(
        client, "match-withdrawn@example.com", district.id, NEAR_LAT, REQUEST_LON
    )
    client.patch(
        "/api/v1/donors/profile/availability",
        json={"availability_status": "withdrawn"},
        headers=withdrawn,
    )
    _available_donor(client, "match-available@example.com", district.id, NEAR_LAT, REQUEST_LON)

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 2},
        headers=requester_headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_donors_outside_radius_are_excluded(client, requester_headers, district):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]
    _available_donor(client, "match-far@example.com", district.id, FAR_LAT, REQUEST_LON)

    narrow = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 1},
        headers=requester_headers,
    )
    wide = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 10},
        headers=requester_headers,
    )

    assert narrow.status_code == 200
    assert narrow.json() == []
    assert wide.status_code == 200
    assert len(wide.json()) == 1


def test_donor_without_coordinates_is_excluded(client, requester_headers, district):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]
    headers = auth_headers(client, "match-nolocation@example.com")
    create_donor_profile(client, headers, district.id)

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 10},
        headers=requester_headers,
    )

    assert response.status_code == 200
    assert response.json() == []


def test_request_without_coordinates_returns_clear_error(client, requester_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        headers=requester_headers,
    )

    assert response.status_code == 422
    assert "coordinates" in response.json()["detail"]


def test_requesters_own_donor_profile_is_excluded(client, requester_headers, district):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]
    create_donor_profile(
        client,
        requester_headers,
        district.id,
        latitude=NEAR_LAT,
        longitude=REQUEST_LON,
    )
    _available_donor(client, "match-other-donor@example.com", district.id, NEAR_LAT, REQUEST_LON)

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 2},
        headers=requester_headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_blood_group_is_used_as_candidate_filter(client, requester_headers, district):
    request_id = _request_with_location(
        client, requester_headers, district.id, blood_group="A+"
    ).json()["id"]
    _available_donor(
        client, "match-a-positive@example.com", district.id, NEAR_LAT, REQUEST_LON, blood_group="A+"
    )
    _available_donor(
        client, "match-o-positive@example.com", district.id, NEAR_LAT, REQUEST_LON, blood_group="O+"
    )

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 2},
        headers=requester_headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["blood_group"] == "A+"


def test_non_owner_cannot_view_matches(client, requester_headers, other_headers, district):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        headers=other_headers,
    )

    assert response.status_code == 403


def test_matching_does_not_expose_private_fields(client, requester_headers, district):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]
    _available_donor(client, "match-private@example.com", district.id, NEAR_LAT, REQUEST_LON)

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 2},
        headers=requester_headers,
    )

    assert response.status_code == 200
    assert set(response.json()[0]) == {
        "donor_profile_id",
        "blood_group",
        "availability_status",
        "district",
        "locality",
        "distance_km",
        "contact_verified",
    }


@pytest.mark.parametrize("radius", [0, -1, 51, 500])
def test_invalid_or_excessive_radius_is_rejected(client, requester_headers, district, radius):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": radius},
        headers=requester_headers,
    )

    assert response.status_code == 422


def test_matching_does_not_change_request_status_or_create_responses(
    client, requester_headers, district, db_session
):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]
    _available_donor(client, "match-status@example.com", district.id, NEAR_LAT, REQUEST_LON)

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 2},
        headers=requester_headers,
    )

    assert response.status_code == 200
    db_session.expire_all()
    stored = db_session.get(BloodRequest, request_id)
    assert stored.status == RequestStatus.OPEN
    assert db_session.query(DonorResponse).filter_by(request_id=request_id).count() == 0


def test_candidates_are_ordered_by_distance(client, requester_headers, district):
    request_id = _request_with_location(client, requester_headers, district.id).json()["id"]
    _available_donor(client, "match-far-order@example.com", district.id, FAR_LAT, REQUEST_LON)
    _available_donor(client, "match-near-order@example.com", district.id, NEAR_LAT, REQUEST_LON)

    response = client.get(
        f"/api/v1/requests/{request_id}/matches",
        params={"radius_km": 10},
        headers=requester_headers,
    )

    assert response.status_code == 200
    distances = [item["distance_km"] for item in response.json()]
    assert distances == sorted(distances)
