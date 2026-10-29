from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.schemas import Token, UserCreate, UserLogin
from app.modules.auth.service import AuthService
from app.modules.users.models import User
from app.modules.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, service: AuthService = Depends(get_auth_service)) -> User:
    return service.register(user_in)


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, service: AuthService = Depends(get_auth_service)) -> Token:
    user = service.authenticate(str(user_in.email), user_in.password)
    return service.issue_token(user)


@router.post("/token", response_model=Token, summary="OAuth2 password flow")
def token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_service),
) -> Token:
    user = service.authenticate(form_data.username, form_data.password)
    return service.issue_token(user)


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user
