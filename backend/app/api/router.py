"""Aggregated API router (modular per football-club domain)."""
from fastapi import APIRouter

from app.api.routes import (
    achievements,
    analytics,
    auth,
    club,
    competitions,
    content,
    customers,
    gallery,
    match_events,
    match_lineups,
    matches,
    media,
    membership,
    merchandise,
    players,
    seasons,
    readiness,
    seo,
    site,
    social,
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
api_router.include_router(match_lineups.router, prefix="/match-lineups")
api_router.include_router(match_events.router, prefix="/match-events")
api_router.include_router(content.router, prefix="/content")
api_router.include_router(gallery.router, prefix="/gallery")
api_router.include_router(media.router, prefix="/media")
api_router.include_router(sponsors.router, prefix="/sponsors")
api_router.include_router(achievements.router, prefix="/achievements")
api_router.include_router(analytics.router, prefix="/analytics")
api_router.include_router(seo.router, prefix="/seo")
api_router.include_router(social.router, prefix="/social")
api_router.include_router(merchandise.router, prefix="/merchandise")
api_router.include_router(customers.router, prefix="/baraya")
api_router.include_router(membership.router, prefix="/baraya")
api_router.include_router(customers.member_router, prefix="/member")
api_router.include_router(readiness.router, prefix="/readiness")
api_router.include_router(site.banners_router, prefix="/banners")
api_router.include_router(site.site_content_router, prefix="/site-content")
