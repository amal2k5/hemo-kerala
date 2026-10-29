from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1 import auth, health
from app.config import settings
from app.database import Base, engine, get_db
from app.logging import setup_logging

setup_logging()

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/api/v1/health", tags=["health"])
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "service": settings.APP_NAME}
