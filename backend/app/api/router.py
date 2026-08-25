"""Aggregated API router (modular per football-club domain)."""
from fastapi import APIRouter

from app.api.routes import (
    achievements,
    analytics,
    auth,
    club,
    competitions,
    content,
    gallery,
    matches,
    media,
    players,
    seasons,
    seo,
    sponsors,
    staff,
    system,
    teams,
    users,
)

api_router = APIRouter()

api_router.include_router(system.router, prefix="")
api_router.include_router(system.router, prefix="/system")
api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(users.router, prefix="/users")
api_router.include_router(club.router, prefix="/club")
api_router.include_router(teams.router, prefix="/teams")
api_router.include_router(players.router, prefix="/players")
api_router.include_router(staff.router, prefix="/staff")
api_router.include_router(seasons.router, prefix="/seasons")
api_router.include_router(competitions.router, prefix="/competitions")
api_router.include_router(matches.router, prefix="/matches")
api_router.include_router(content.router, prefix="/content")
api_router.include_router(gallery.router, prefix="/gallery")
api_router.include_router(media.router, prefix="/media")
api_router.include_router(sponsors.router, prefix="/sponsors")
api_router.include_router(achievements.router, prefix="/achievements")
api_router.include_router(analytics.router, prefix="/analytics")
api_router.include_router(seo.router, prefix="/seo")
