from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, ConflictError, InactiveUserError
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.schemas import Token, UserCreate
from app.modules.users.models import User
from app.modules.users.repository import UserRepository


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(self, user_in: UserCreate) -> User:
        if self.users.get_by_email(str(user_in.email)) is not None:
            raise ConflictError("Email already registered")

        user = User(
            email=str(user_in.email),
            hashed_password=hash_password(user_in.password),
            full_name=user_in.full_name,
            phone_number=user_in.phone_number,
        )
        self.users.add(user)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("Email already registered") from exc

        self.db.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise AuthenticationError("Incorrect email or password")
        if not user.is_active:
            raise InactiveUserError()
        return user

    @staticmethod
    def issue_token(user: User) -> Token:
        return Token(access_token=create_access_token(subject=user.id), token_type="bearer")
