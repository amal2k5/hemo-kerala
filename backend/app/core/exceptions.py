from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Base class for expected business-rule failures.

    Services raise these; a single handler turns them into HTTP responses,
    so services never depend on FastAPI.
    """

    status_code: int = status.HTTP_400_BAD_REQUEST
    detail: str = "Request could not be processed"

    def __init__(self, detail: str | None = None) -> None:
        self.detail = detail or self.detail
        super().__init__(self.detail)


class ConflictError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    detail = "Resource already exists"


class AuthenticationError(DomainError):
    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Could not validate credentials"


class InactiveUserError(AuthenticationError):
    detail = "Inactive user"


class PermissionDeniedError(DomainError):
    status_code = status.HTTP_403_FORBIDDEN
    detail = "Permission denied"


class NotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    detail = "Resource not found"


class ValidationFailedError(DomainError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    detail = "Validation failed"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
        headers = {}
        if isinstance(exc, AuthenticationError):
            headers["WWW-Authenticate"] = "Bearer"
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers,
        )
