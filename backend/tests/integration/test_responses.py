from datetime import UTC, datetime, timedelta

import pytest

from app.modules.locations.models import District
from app.modules.requests.models import BloodRequest, RequestStatus
from tests.integration.factories import (
    auth_headers,
    create_donor_profile,
    create_request,
)


@pytest.fixture
def district(db_session) -> District:
    return db_session.query(District).filter(District.code == "palakkad").one()


@pytest.fixture
def requester_headers(client) -> dict[str, str]:
    return auth_headers(client, "requester@example.com")


@pytest.fixture
def donor_headers(client, district) -> dict[str, str]:
    headers = auth_headers(client, "donor@example.com")
    create_donor_profile(client, headers, district.id)
    return headers


@pytest.fixture
def other_donor_headers(client, district) -> dict[str, str]:
    headers = auth_headers(client, "other-donor@example.com")
    create_donor_profile(client, headers, district.id)
    return headers


def _respond(client, headers, request_id):
    return client.post(f"/api/v1/requests/{request_id}/responses", headers=headers)


def test_donor_can_respond(client, requester_headers, donor_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]

    response = _respond(client, donor_headers, request_id)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["request_id"] == request_id
    assert body["is_owner"] is True

    request_view = client.get(f"/api/v1/requests/{request_id}", headers=requester_headers)
    assert request_view.json()["status"] == RequestStatus.RESPONSES_RECEIVED


def test_responding_requires_donor_profile(client, requester_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    no_profile_headers = auth_headers(client, "no-profile@example.com")

    response = _respond(client, no_profile_headers, request_id)

    assert response.status_code == 403


def test_cannot_respond_to_own_request(client, district):
    own_headers = auth_headers(client, "self@example.com")
    create_donor_profile(client, own_headers, district.id)
    request_id = create_request(client, own_headers, district.id).json()["id"]

    response = _respond(client, own_headers, request_id)

    assert response.status_code == 403


def test_duplicate_response_rejected(client, requester_headers, donor_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]

    first = _respond(client, donor_headers, request_id)
    second = _respond(client, donor_headers, request_id)

    assert first.status_code == 201
    assert second.status_code == 409


def test_requester_sees_all_responses(client, requester_headers, donor_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    _respond(client, donor_headers, request_id)

    response = client.get(f"/api/v1/requests/{request_id}/responses", headers=requester_headers)

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["is_owner"] is False


def test_donor_only_sees_own_response(
    client, requester_headers, donor_headers, other_donor_headers, district
):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    _respond(client, donor_headers, request_id)

    own = client.get(f"/api/v1/requests/{request_id}/responses", headers=donor_headers)
    other = client.get(f"/api/v1/requests/{request_id}/responses", headers=other_donor_headers)

    assert own.status_code == 200
    assert len(own.json()) == 1
    assert other.status_code == 200
    assert other.json() == []


def test_non_donor_cannot_list_responses(client, requester_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    outsider_headers = auth_headers(client, "outsider@example.com")

    response = client.get(f"/api/v1/requests/{request_id}/responses", headers=outsider_headers)

    assert response.status_code == 403


def test_only_responding_donor_can_update(
    client, requester_headers, donor_headers, other_donor_headers, district
):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    response_id = _respond(client, donor_headers, request_id).json()["id"]

    by_other_donor = client.patch(
        f"/api/v1/requests/{request_id}/responses/{response_id}",
        json={"status": "withdrawn"},
        headers=other_donor_headers,
    )
    by_requester = client.patch(
        f"/api/v1/requests/{request_id}/responses/{response_id}",
        json={"status": "withdrawn"},
        headers=requester_headers,
    )

    assert by_other_donor.status_code == 403
    assert by_requester.status_code == 403


def test_accepting_response_moves_request_into_coordination(
    client, requester_headers, donor_headers, district
):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    response_id = _respond(client, donor_headers, request_id).json()["id"]

    accepted = client.patch(
        f"/api/v1/requests/{request_id}/responses/{response_id}",
        json={"status": "accepted"},
        headers=donor_headers,
    )

    assert accepted.status_code == 200
    assert accepted.json()["status"] == "accepted"

    request_view = client.get(f"/api/v1/requests/{request_id}", headers=requester_headers)
    assert request_view.json()["status"] == RequestStatus.COORDINATION_IN_PROGRESS


def test_invalid_response_state_transitions(client, requester_headers, donor_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    response_id = _respond(client, donor_headers, request_id).json()["id"]
    client.patch(
        f"/api/v1/requests/{request_id}/responses/{response_id}",
        json={"status": "declined"},
        headers=donor_headers,
    )

    response = client.patch(
        f"/api/v1/requests/{request_id}/responses/{response_id}",
        json={"status": "withdrawn"},
        headers=donor_headers,
    )

    assert response.status_code == 409


def test_accepted_response_can_be_withdrawn(client, requester_headers, donor_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    response_id = _respond(client, donor_headers, request_id).json()["id"]
    client.patch(
        f"/api/v1/requests/{request_id}/responses/{response_id}",
        json={"status": "accepted"},
        headers=donor_headers,
    )

    response = client.patch(
        f"/api/v1/requests/{request_id}/responses/{response_id}",
        json={"status": "withdrawn"},
        headers=donor_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "withdrawn"


def test_cannot_respond_to_cancelled_request(client, requester_headers, donor_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    client.post(f"/api/v1/requests/{request_id}/cancel", headers=requester_headers)

    response = _respond(client, donor_headers, request_id)

    assert response.status_code == 409


def test_cannot_respond_to_expired_request(
    client, requester_headers, donor_headers, district, db_session
):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    stored = db_session.get(BloodRequest, request_id)
    stored.required_by = datetime.now(UTC) - timedelta(minutes=1)
    db_session.commit()

    response = _respond(client, donor_headers, request_id)

    assert response.status_code == 409
    request_view = client.get(f"/api/v1/requests/{request_id}", headers=requester_headers)
    assert request_view.json()["status"] == RequestStatus.EXPIRED


def test_acceptance_does_not_mark_request_fulfilled(
    client, requester_headers, donor_headers, district
):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    response_id = _respond(client, donor_headers, request_id).json()["id"]
    client.patch(
        f"/api/v1/requests/{request_id}/responses/{response_id}",
        json={"status": "accepted"},
        headers=donor_headers,
    )

    before_confirmation = client.get(f"/api/v1/requests/{request_id}", headers=requester_headers)
    assert before_confirmation.json()["status"] != RequestStatus.FULFILLED

    confirmed = client.post(
        f"/api/v1/requests/{request_id}/confirm-fulfilment",
        json={"outcome": "fulfilled"},
        headers=requester_headers,
    )
    assert confirmed.json()["status"] == RequestStatus.FULFILLED


def test_response_endpoints_require_authentication(client, requester_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]

    assert client.post(f"/api/v1/requests/{request_id}/responses").status_code == 401
    assert client.get(f"/api/v1/requests/{request_id}/responses").status_code == 401
    assert (
        client.patch(
            f"/api/v1/requests/{request_id}/responses/1",
            json={"status": "accepted"},
        ).status_code
        == 401
    )


def test_response_does_not_expose_contact_details(
    client, requester_headers, donor_headers, district
):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    _respond(client, donor_headers, request_id)

    response = client.get(f"/api/v1/requests/{request_id}/responses", headers=requester_headers)

    body = response.json()[0]
    assert "email" not in body
    assert "phone_number" not in body
    assert "donor_profile_id" not in body
