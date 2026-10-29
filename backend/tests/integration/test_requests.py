from datetime import UTC, datetime, timedelta

import pytest

from app.modules.locations.models import District
from app.modules.requests.models import BloodRequest, RequestStatus
from tests.integration.factories import (
    auth_headers,
    create_request,
    future_deadline,
)


@pytest.fixture
def district(db_session) -> District:
    return db_session.query(District).filter(District.code == "palakkad").one()


@pytest.fixture
def requester_headers(client) -> dict[str, str]:
    return auth_headers(client, "requester@example.com")


@pytest.fixture
def other_headers(client) -> dict[str, str]:
    return auth_headers(client, "other@example.com")


def test_create_request(client, requester_headers, district):
    response = create_request(
        client,
        requester_headers,
        district.id,
        locality="Nemmara",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "open"
    assert body["blood_group"] == "O+"
    assert body["component"] == "whole_blood"
    assert body["district"] == {"id": district.id, "name": "Palakkad"}
    assert body["locality"] == "Nemmara"
    assert body["is_owner"] is True
    assert "requester_id" not in body
    assert "created_at" in body
    assert "updated_at" in body


@pytest.mark.parametrize(
    "overrides",
    [
        {"blood_group": "C+"},
        {"component": "bone_marrow"},
        {"required_by": "2020-01-01T00:00:00+00:00"},
        {"status": "fulfilled"},
    ],
)
def test_invalid_request_fields_rejected(client, requester_headers, district, overrides):
    response = create_request(client, requester_headers, district.id, **overrides)

    assert response.status_code == 422


def test_unknown_district_rejected(client, requester_headers):
    response = create_request(client, requester_headers, 999999)

    assert response.status_code == 422


def test_list_active_requests_excludes_cancelled(client, requester_headers, district):
    first = create_request(client, requester_headers, district.id).json()
    second = create_request(client, requester_headers, district.id).json()
    client.post(f"/api/v1/requests/{first['id']}/cancel", headers=requester_headers)

    response = client.get("/api/v1/requests", headers=requester_headers)

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert second["id"] in ids
    assert first["id"] not in ids


def test_list_active_requests_excludes_expired(client, requester_headers, district, db_session):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    stored = db_session.get(BloodRequest, request_id)
    stored.required_by = datetime.now(UTC) - timedelta(minutes=1)
    db_session.commit()

    response = client.get("/api/v1/requests", headers=requester_headers)

    assert response.status_code == 200
    assert request_id not in [item["id"] for item in response.json()]


def test_list_active_requests_is_paginated(client, requester_headers, district):
    for _ in range(3):
        create_request(client, requester_headers, district.id)

    response = client.get(
        "/api/v1/requests", params={"limit": 2, "offset": 0}, headers=requester_headers
    )

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_request_detail_marks_ownership(client, requester_headers, other_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]

    owner_view = client.get(f"/api/v1/requests/{request_id}", headers=requester_headers)
    other_view = client.get(f"/api/v1/requests/{request_id}", headers=other_headers)

    assert owner_view.status_code == 200
    assert owner_view.json()["is_owner"] is True
    assert other_view.status_code == 200
    assert other_view.json()["is_owner"] is False


def test_get_unknown_request_returns_404(client, requester_headers):
    response = client.get("/api/v1/requests/999999", headers=requester_headers)

    assert response.status_code == 404


def test_only_owner_can_cancel(client, requester_headers, other_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]

    denied = client.post(f"/api/v1/requests/{request_id}/cancel", headers=other_headers)
    assert denied.status_code == 403

    cancelled = client.post(f"/api/v1/requests/{request_id}/cancel", headers=requester_headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"


def test_cannot_cancel_twice(client, requester_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    client.post(f"/api/v1/requests/{request_id}/cancel", headers=requester_headers)

    response = client.post(f"/api/v1/requests/{request_id}/cancel", headers=requester_headers)

    assert response.status_code == 409


def test_only_owner_can_confirm_fulfilment(client, requester_headers, other_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]

    response = client.post(
        f"/api/v1/requests/{request_id}/confirm-fulfilment",
        json={"outcome": "fulfilled"},
        headers=other_headers,
    )

    assert response.status_code == 403


def test_confirm_fulfilment_after_cancel_is_rejected(client, requester_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    client.post(f"/api/v1/requests/{request_id}/cancel", headers=requester_headers)

    response = client.post(
        f"/api/v1/requests/{request_id}/confirm-fulfilment",
        json={"outcome": "fulfilled"},
        headers=requester_headers,
    )

    assert response.status_code == 409


def test_confirm_fulfilment_outcomes(client, requester_headers, district):
    fulfilled = create_request(client, requester_headers, district.id).json()["id"]
    response = client.post(
        f"/api/v1/requests/{fulfilled}/confirm-fulfilment",
        json={"outcome": "fulfilled"},
        headers=requester_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "fulfilled"

    partial = create_request(client, requester_headers, district.id).json()["id"]
    response = client.post(
        f"/api/v1/requests/{partial}/confirm-fulfilment",
        json={"outcome": "partially_fulfilled"},
        headers=requester_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "partially_fulfilled"


def test_invalid_outcome_rejected(client, requester_headers, district):
    request_id = create_request(client, requester_headers, district.id).json()["id"]

    response = client.post(
        f"/api/v1/requests/{request_id}/confirm-fulfilment",
        json={"outcome": "maybe"},
        headers=requester_headers,
    )

    assert response.status_code == 422


def test_detail_marks_expired_request(client, requester_headers, district, db_session):
    request_id = create_request(client, requester_headers, district.id).json()["id"]
    stored = db_session.get(BloodRequest, request_id)
    stored.required_by = datetime.now(UTC) - timedelta(minutes=1)
    db_session.commit()

    response = client.get(f"/api/v1/requests/{request_id}", headers=requester_headers)

    assert response.status_code == 200
    assert response.json()["status"] == RequestStatus.EXPIRED


def test_request_endpoints_require_authentication(client, district):
    assert client.get("/api/v1/requests").status_code == 401
    assert (
        client.post(
            "/api/v1/requests",
            json={
                "blood_group": "O+",
                "component": "whole_blood",
                "district_id": district.id,
                "required_by": future_deadline(),
            },
        ).status_code
        == 401
    )
