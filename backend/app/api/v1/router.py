from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.blood_banks.router import router as blood_banks_router
from app.modules.donors.router import router as donors_router
from app.modules.health.router import router as health_router
from app.modules.locations.router import router as locations_router
from app.modules.matching.router import router as matching_router
from app.modules.requests.router import router as requests_router
from app.modules.responses.router import router as responses_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(donors_router)
api_router.include_router(locations_router)
api_router.include_router(requests_router)
api_router.include_router(responses_router)
api_router.include_router(matching_router)
api_router.include_router(blood_banks_router)
