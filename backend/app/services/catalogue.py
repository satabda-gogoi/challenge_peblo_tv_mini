from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Show,
    Season,
    Episode,
    ContentGroup,
)
from app.models.enums import ShowStatus, EpisodeStatus


async def generate_catalogue(db: AsyncSession) -> dict:
    """
    Builds the published catalogue JSON strictly adhering to reference.json conventions:
    1. Only published shows and published episodes appear.
    2. content_group variants collapse into one catalogue episode entry with a languages map.
    3. Season 0 is isolated as trailers (never rendered as a normal season).
    4. Deterministic sorting by section and title.
    5. Root object contains both a flat 'shows' list and a 'sections' map for Netflix-style browsing.
    """
    result = await db.execute(
        select(Show)
        .options(
            selectinload(Show.categories),
            selectinload(Show.seasons)
            .selectinload(Season.episodes)
            .selectinload(Episode.content_group)
            .selectinload(ContentGroup.contents),
            selectinload(Show.seasons)
            .selectinload(Season.episodes)
            .selectinload(Episode.artworks),
        )
        .where(Show.status == ShowStatus.PUBLISHED)
        .order_by(Show.section, Show.title)
    )

    shows = result.scalars().unique().all()
    catalogue_shows = []

    for show in shows:
        normal_seasons = []
        trailers = []
        show_artwork = {"poster": None, "banner": None, "thumbnail": None}

        # Sort seasons deterministically by season number
        for season in sorted(show.seasons, key=lambda s: s.season_number):
            published_episodes = [
                ep for ep in season.episodes if ep.status == EpisodeStatus.PUBLISHED
            ]

            if not published_episodes:
                continue

            catalogue_episodes = []

            for episode in sorted(published_episodes, key=lambda e: e.episode_number):
                languages = {}
                if episode.content_group:
                    for content in episode.content_group.contents:
                        languages[content.language] = {
                            "video_uri": content.video_uri,
                        }

                artwork = {
                    getattr(item.type, "value", str(item.type)): item.storage_uri
                    for item in episode.artworks
                }

                # Propagate artwork to show level if missing
                for art_key in ("poster", "banner", "thumbnail"):
                    if not show_artwork[art_key] and artwork.get(art_key):
                        show_artwork[art_key] = artwork[art_key]

                ep_dict = {
                    "id": episode.id,
                    "source_episode_id": episode.source_episode_id,
                    "episode_number": episode.episode_number,
                    "title": episode.title,
                    "description": episode.description,
                    "duration_seconds": episode.duration_seconds,
                    "content_group": episode.content_group.group_code if episode.content_group else None,
                    "available_languages": sorted(list(languages.keys())),
                    "languages": languages,
                    "artwork": artwork,
                }

                if season.season_number == 0:
                    trailers.append(ep_dict)
                else:
                    catalogue_episodes.append(ep_dict)

            if season.season_number > 0 and catalogue_episodes:
                normal_seasons.append({
                    "season_number": season.season_number,
                    "episodes": catalogue_episodes,
                })

        show_entry = {
            "id": f"show_{show.id:03d}",
            "raw_id": show.id,
            "title": show.title,
            "slug": show.slug,
            "synopsis": show.synopsis,
            "section": show.section,
            "categories": sorted([category.name for category in show.categories]),
            "artwork": show_artwork,
            "trailers": trailers,
            "seasons": normal_seasons,
        }

        catalogue_shows.append(show_entry)

    # Group deterministically by sections per reference.json
    sections_map = {
        "featured": [],
        "series": [],
        "minisodes": [],
        "songs": [],
    }

    for s in catalogue_shows:
        sec = s.get("section")
        if sec in sections_map:
            sections_map[sec].append(s)
        else:
            sections_map.setdefault(sec or "other", []).append(s)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "version": 1,
        "shows_count": len(catalogue_shows),
        "shows": catalogue_shows,
        "sections": sections_map,
    }