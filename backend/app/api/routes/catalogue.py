import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models import PublishRun
from app.models.enums import PublishOutcome


router = APIRouter(prefix="/catalogue", tags=["Catalogue"])

CATALOGUE_DIR = Path(__file__).resolve().parents[3] / "data" / "catalogue"

@router.get("")
async def get_catalogue():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PublishRun)
            .where(PublishRun.outcome == PublishOutcome.SUCCESS)
            .order_by(PublishRun.id.desc())
        )

        publish_run = result.scalars().first()

    if publish_run is None:
        raise HTTPException(
            status_code=404,
            detail="No published catalogue available",
        )

    if not publish_run.catalogue_uri:
        raise HTTPException(
            status_code=404,
            detail="Published catalogue file not found",
        )

    catalogue_path = Path(publish_run.catalogue_uri)
    if not catalogue_path.is_absolute() and not catalogue_path.exists():
        catalogue_path = CATALOGUE_DIR / Path(publish_run.catalogue_uri).name

    if not catalogue_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Catalogue file does not exist",
        )

    return json.loads(
        catalogue_path.read_text(encoding="utf-8")
    )


@router.get("/search")
async def search_catalogue(
    q: str = "",
    category: str = "",
    language: str = "",
    section: str = "",
):
    catalogue = await get_catalogue()

    query = q.strip().lower()
    cat_filter = category.strip().lower()
    lang_filter = language.strip().lower()
    sec_filter = section.strip().lower()

    if not any([query, cat_filter, lang_filter, sec_filter]):
        return catalogue

    filtered_shows = []

    for show in catalogue.get("shows", []):
        # 1. Section filter
        if sec_filter and (show.get("section") or "").lower() != sec_filter:
            continue

        # 2. Category filter
        if cat_filter:
            show_categories = [c.lower() for c in show.get("categories", [])]
            if cat_filter not in show_categories:
                continue

        # 3. Query & Language filter
        show_level_query_match = (
            not query
            or query in show.get("title", "").lower()
            or query in (show.get("synopsis") or "").lower()
            or any(query in c.lower() for c in show.get("categories", []))
        )

        matching_seasons = []
        has_matching_episodes = False

        for season in show.get("seasons", []):
            matching_episodes = []
            for episode in season.get("episodes", []):
                # Language filter
                ep_langs = [l.lower() for l in episode.get("available_languages", [])]
                if not ep_langs and "languages" in episode:
                    ep_langs = [l.lower() for l in episode["languages"].keys()]

                if lang_filter and lang_filter not in ep_langs:
                    continue

                # Query filter on episode
                ep_query_match = (
                    not query
                    or query in episode.get("title", "").lower()
                    or query in (episode.get("description") or "").lower()
                )

                if show_level_query_match or ep_query_match:
                    matching_episodes.append(episode)
                    has_matching_episodes = True

            if matching_episodes:
                matching_seasons.append({
                    **season,
                    "episodes": matching_episodes,
                })

        # Filter trailers if language filter is applied
        trailers = []
        for trailer in show.get("trailers", []):
            t_langs = [l.lower() for l in trailer.get("available_languages", [])]
            if not t_langs and "languages" in trailer:
                t_langs = [l.lower() for l in trailer["languages"].keys()]
            if lang_filter and lang_filter not in t_langs:
                continue
            if not query or query in trailer.get("title", "").lower() or show_level_query_match:
                trailers.append(trailer)

        # If query matched show level and no language filter, or if episodes matched
        if (show_level_query_match and not lang_filter) or has_matching_episodes:
            filtered_shows.append({
                **show,
                "seasons": matching_seasons if (lang_filter or not show_level_query_match) else show.get("seasons", []),
                "trailers": trailers if (lang_filter or query) else show.get("trailers", []),
            })

    # Reconstruct sections map for filtered shows
    sections_map = {
        "featured": [],
        "series": [],
        "minisodes": [],
        "songs": [],
    }

    for s in filtered_shows:
        sec = s.get("section")
        if sec in sections_map:
            sections_map[sec].append(s)
        else:
            sections_map.setdefault(sec or "other", []).append(s)

    return {
        "generated_at": catalogue.get("generated_at"),
        "version": catalogue.get("version", 1),
        "shows_count": len(filtered_shows),
        "shows": filtered_shows,
        "sections": sections_map,
    }


@router.get("/category/{category_name}")
async def get_catalogue_by_category(category_name: str):
    catalogue = await get_catalogue()

    category = category_name.strip().lower()

    filtered_shows = [
        show
        for show in catalogue["shows"]
        if any(
            item.lower() == category
            for item in show["categories"]
        )
    ]

    return {
        **catalogue,
        "shows": filtered_shows,
    }