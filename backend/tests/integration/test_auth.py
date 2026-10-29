from app.modules.users.models import User


def test_successful_registration(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "register@example.com",
            "password": "secret123",
            "full_name": "Register User",
            "phone_number": "1234567890",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "register@example.com"
    assert data["full_name"] == "Register User"
    assert data["phone_number"] == "1234567890"
    assert data["is_active"] is True
    assert "hashed_password" not in data
    assert "id" in data


def test_duplicate_email_registration(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "secret123",
            "full_name": "Duplicate User",
        },
    )
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "secret123",
            "full_name": "Duplicate User Two",
        },
    )
    assert response.status_code == 409


def test_successful_login(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "secret123",
            "full_name": "Login User",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_incorrect_credentials(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrong@example.com",
            "password": "secret123",
            "full_name": "Wrong User",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "wrong@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_me_with_valid_token(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "me@example.com",
            "password": "secret123",
            "full_name": "Me User",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "me@example.com", "password": "secret123"},
    )
    token = login.json()["access_token"]
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["full_name"] == "Me User"
    assert "hashed_password" not in data


def test_me_without_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token(client):
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"}
    )
    assert response.status_code == 401


def test_inactive_user_authentication_rejection(client, db_session):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "inactive@example.com",
            "password": "secret123",
            "full_name": "Inactive User",
        },
    )
    user = db_session.query(User).filter(User.email == "inactive@example.com").first()
    user.is_active = False
    db_session.commit()

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@example.com", "password": "secret123"},
    )
    assert login.status_code == 401
