from app.core.security import hash_password, verify_password


def test_password_hashing_and_verification():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_decode_access_token_rejects_garbage():
    from app.core.security import decode_access_token

    assert decode_access_token("not.a.token") is None
