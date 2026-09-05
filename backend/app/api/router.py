from fastapi import APIRouter

from app.api.routes import (
    auth,
    shows,
    seasons,
    episodes,
    content,
    artworks,
    categories,
    validation,
    publish,
    catalogue,
)


api_router = APIRouter(prefix="/api")


api_router.include_router(auth.router)
api_router.include_router(shows.router)
api_router.include_router(seasons.router)
api_router.include_router(episodes.router)
api_router.include_router(content.router)
api_router.include_router(artworks.router)
api_router.include_router(categories.router)
api_router.include_router(validation.router)
api_router.include_router(publish.router)
api_router.include_router(catalogue.router)