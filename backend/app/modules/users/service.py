from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, InactiveUserError
from app.modules.users.models import User
from app.modules.users.repository import UserRepository


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def get_active_user(self, user_id: int) -> User:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise AuthenticationError()
        if not user.is_active:
            raise InactiveUserError()
        return user
