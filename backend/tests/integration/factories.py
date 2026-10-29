from datetime import UTC, datetime, timedelta

PASSWORD = "secret123"


def auth_headers(client, email: str, full_name: str = "Test User") -> dict[str, str]:
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "full_name": full_name},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def future_deadline(hours: int = 24) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def create_donor_profile(client, headers, district_id=None, **overrides):
    payload = {"blood_group": "O+"}
    if district_id is not None:
        payload["district_id"] = district_id
    payload.update(overrides)
    return client.post("/api/v1/donors/profile", json=payload, headers=headers)


def create_request(client, headers, district_id, **overrides):
    payload = {
        "blood_group": "O+",
        "component": "whole_blood",
        "district_id": district_id,
        "required_by": future_deadline(),
    }
    payload.update(overrides)
    return client.post("/api/v1/requests", json=payload, headers=headers)
