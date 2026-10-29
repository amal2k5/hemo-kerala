from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.donors.router import router as donors_router
from app.modules.health.router import router as health_router
from app.modules.locations.router import router as locations_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(donors_router)
api_router.include_router(locations_router)
