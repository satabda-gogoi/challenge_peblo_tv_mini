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


VALID_SECTIONS = {
    "featured",
    "series",
    "minisodes",
    "songs",
}

VALID_LANGUAGES = {
    "en",
    "hi",
}

REQUIRED_ARTWORKS = {
    "poster": (600, 900),
    "banner": (1280, 720),
    "thumbnail": (640, 360),
}

MAX_ARTWORK_SIZE = 200 * 1024


async def validate_episode(
    db: AsyncSession,
    episode_id: int,
) -> dict:
    """
    Validate one episode.

    This validates the episode itself regardless of whether
    it is draft or published.
    """

    result = await db.execute(
        select(Episode)
        .options(
            selectinload(Episode.content_group)
            .selectinload(ContentGroup.contents),

            selectinload(Episode.artworks),
        )
        .where(Episode.id == episode_id)
    )

    episode = result.scalar_one_or_none()

    if episode is None:
        return {
            "valid": False,
            "errors": [
                {
                    "level": "error",
                    "field": "episode",
                    "message": "Episode not found",
                }
            ],
            "warnings": [],
        }

    errors = []
    warnings = []

    # ---------------------------------------------------------
    # DURATION
    # ---------------------------------------------------------

    if (
        episode.duration_seconds is None
        or episode.duration_seconds <= 0
    ):
        errors.append({
            "level": "error",
            "field": "duration",
            "message": (
                f"Episode '{episode.title}' "
                "must have a positive duration"
            ),
        })

    # ---------------------------------------------------------
    # CONTENT
    # ---------------------------------------------------------

    if episode.content_group is None:
        errors.append({
            "level": "error",
            "field": "content",
            "message": (
                f"Episode '{episode.title}' "
                "has no content group"
            ),
        })
    else:
        contents = episode.content_group.contents

        if not contents:
            errors.append({
                "level": "error",
                "field": "content",
                "message": (
                    f"Episode '{episode.title}' "
                    "has no language content"
                ),
            })

        for content in contents:

            if content.language not in VALID_LANGUAGES:
                errors.append({
                    "level": "error",
                    "field": f"content_{content.id}.language",
                    "message": (
                        f"Invalid language "
                        f"'{content.language}'"
                    ),
                })

            if not content.video_uri:
                errors.append({
                    "level": "error",
                    "field": f"content_{content.id}.video_uri",
                    "message": "Video URI is required",
                })

    # ---------------------------------------------------------
    # ARTWORK
    # ---------------------------------------------------------

    artwork_by_type = {
        getattr(artwork.type, "value", str(artwork.type)): artwork
        for artwork in episode.artworks
    }

    # Check if episode is a Season 0 trailer (which only requires thumbnail)
    is_trailer = False
    if episode.season_id:
        season_res = await db.execute(select(Season).where(Season.id == episode.season_id))
        s_obj = season_res.scalar_one_or_none()
        if s_obj and s_obj.season_number == 0:
            is_trailer = True

    req_artworks = {"thumbnail": REQUIRED_ARTWORKS["thumbnail"]} if is_trailer else REQUIRED_ARTWORKS

    for artwork_type, dimensions in req_artworks.items():

        artwork = artwork_by_type.get(artwork_type)

        if artwork is None:
            errors.append({
                "level": "error",
                "field": "artwork",
                "message": (
                    f"Episode '{episode.title}' "
                    f"is missing {artwork_type} artwork"
                ),
            })
            continue

        expected_width, expected_height = dimensions

        if (
            artwork.width != expected_width
            or artwork.height != expected_height
        ):
            errors.append({
                "level": "error",
                "field": f"artwork_{artwork.id}.dimensions",
                "message": (
                    f"{artwork_type} artwork must be "
                    f"{expected_width}x{expected_height}"
                ),
            })

        if (
            artwork.size_bytes is not None
            and artwork.size_bytes > MAX_ARTWORK_SIZE
        ):
            errors.append({
                "level": "error",
                "field": f"artwork_{artwork.id}.size",
                "message": (
                    f"{artwork_type} artwork exceeds "
                    "200KB"
                ),
            })

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


async def validate_show(
    db: AsyncSession,
    show_id: int,
) -> dict:
    """
    Validate one show and its published episodes.
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
        .where(Show.id == show_id)
    )

    show = result.scalar_one_or_none()

    if show is None:
        return {
            "valid": False,
            "errors": [
                {
                    "level": "error",
                    "field": "show",
                    "message": "Show not found",
                }
            ],
            "warnings": [],
        }

    errors = []
    warnings = []

    # ---------------------------------------------------------
    # SHOW
    # ---------------------------------------------------------

    if show.section not in VALID_SECTIONS:
        errors.append({
            "level": "error",
            "field": "section",
            "message": "Invalid or missing section",
        })

    if not show.categories:
        errors.append({
            "level": "error",
            "field": "categories",
            "message": (
                "Show must have at least one category"
            ),
        })

    if not show.seasons:
        errors.append({
            "level": "error",
            "field": "seasons",
            "message": (
                "Show must have at least one season"
            ),
        })

    published_episodes = []

    # ---------------------------------------------------------
    # EPISODES
    # ---------------------------------------------------------

    for season in show.seasons:

        for episode in season.episodes:

            # Draft episodes do not block publishing.
            if episode.status != EpisodeStatus.PUBLISHED:
                continue

            published_episodes.append(episode)

            # Duration
            if (
                episode.duration_seconds is None
                or episode.duration_seconds <= 0
            ):
                errors.append({
                    "level": "error",
                    "field": (
                        f"episode_{episode.id}.duration"
                    ),
                    "message": (
                        f"Episode '{episode.title}' "
                        "must have a positive duration"
                    ),
                })

            # Content
            if episode.content_group is None:
                errors.append({
                    "level": "error",
                    "field": (
                        f"episode_{episode.id}.content"
                    ),
                    "message": (
                        f"Episode '{episode.title}' "
                        "has no content group"
                    ),
                })
            else:
                contents = episode.content_group.contents

                if not contents:
                    errors.append({
                        "level": "error",
                        "field": (
                            f"episode_{episode.id}.content"
                        ),
                        "message": (
                            f"Episode '{episode.title}' "
                            "has no language content"
                        ),
                    })

                for content in contents:

                    if content.language not in VALID_LANGUAGES:
                        errors.append({
                            "level": "error",
                            "field": (
                                f"content_{content.id}.language"
                            ),
                            "message": (
                                f"Invalid language "
                                f"'{content.language}'"
                            ),
                        })

                    if not content.video_uri:
                        errors.append({
                            "level": "error",
                            "field": (
                                f"content_{content.id}.video_uri"
                            ),
                            "message": (
                                "Video URI is required"
                            ),
                        })

            # Artwork
            artwork_by_type = {
                getattr(artwork.type, "value", str(artwork.type)): artwork
                for artwork in episode.artworks
            }

            # Season 0 (trailers) only requires thumbnail; normal episodes require poster, banner, thumbnail
            req_artworks = (
                {"thumbnail": REQUIRED_ARTWORKS["thumbnail"]}
                if season.season_number == 0
                else REQUIRED_ARTWORKS
            )

            for artwork_type, dimensions in req_artworks.items():

                artwork = artwork_by_type.get(artwork_type)

                if artwork is None:
                    errors.append({
                        "level": "error",
                        "field": (
                            f"episode_{episode.id}.artwork"
                        ),
                        "message": (
                            f"Episode '{episode.title}' "
                            f"is missing {artwork_type} artwork"
                        ),
                    })
                    continue

                expected_width, expected_height = dimensions

                if (
                    artwork.width != expected_width
                    or artwork.height != expected_height
                ):
                    errors.append({
                        "level": "error",
                        "field": (
                            f"artwork_{artwork.id}.dimensions"
                        ),
                        "message": (
                            f"{artwork_type} artwork must be "
                            f"{expected_width}x{expected_height}"
                        ),
                    })

                if (
                    artwork.size_bytes is not None
                    and artwork.size_bytes > MAX_ARTWORK_SIZE
                ):
                    errors.append({
                        "level": "error",
                        "field": (
                            f"artwork_{artwork.id}.size"
                        ),
                        "message": (
                            f"{artwork_type} artwork exceeds "
                            "200KB"
                        ),
                    })

    # ---------------------------------------------------------
    # PUBLISHED SHOW MUST HAVE PUBLISHED EPISODE
    # ---------------------------------------------------------

    if (
        show.status == ShowStatus.PUBLISHED
        and not published_episodes
    ):
        errors.append({
            "level": "error",
            "field": "episodes",
            "message": (
                "Published show must have at least "
                "one published episode"
            ),
        })

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


async def validate_all(
    db: AsyncSession,
) -> dict:
    """
    Validate all published shows for publishing.

    Draft shows are ignored.
    Draft episodes are ignored.
    """

    result = await db.execute(
        select(Show)
        .where(Show.status == ShowStatus.PUBLISHED)
        .order_by(Show.id)
    )

    shows = result.scalars().all()

    validated_shows = []
    all_errors = []

    for show in shows:

        validation = await validate_show(
            db,
            show.id,
        )

        validated_shows.append({
            "show_id": show.id,
            "title": show.title,
            "show_title": show.title,
            "status": show.status.value,
            "valid": validation["valid"],
            "errors": validation["errors"],
            "warnings": validation["warnings"],
        })

        all_errors.extend(
            validation["errors"]
        )

    return {
        "valid": len(all_errors) == 0 and len(validated_shows) > 0,
        "shows": validated_shows,
        "errors": all_errors,
    }



async def get_validation_report(db: AsyncSession) -> dict:
    """
    Comprehensive validation report for administrators and editors.
    Reports all blocking issues preventing catalogue publishing,
    grouped by show and episode with actionable human-readable messages.
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
        .order_by(Show.id)
    )
    shows = result.scalars().unique().all()

    blocking_issues = []
    draft_notices = []
    show_reports = []
    can_publish = True

    for show in shows:
        show_val = await validate_show(db, show.id)
        is_published = show.status == ShowStatus.PUBLISHED

        if is_published and not show_val["valid"]:
            can_publish = False
            for err in show_val["errors"]:
                blocking_issues.append({
                    "show_id": show.id,
                    "show_title": show.title,
                    "slug": show.slug,
                    "status": show.status.value,
                    "level": "error",
                    "blocking": True,
                    "field": err["field"],
                    "message": err["message"],
                })
        elif not is_published:
            for err in show_val["errors"]:
                draft_notices.append({
                    "show_id": show.id,
                    "show_title": show.title,
                    "slug": show.slug,
                    "status": show.status.value,
                    "level": "info",
                    "blocking": False,
                    "field": err["field"],
                    "message": f"Draft: {err['message']}",
                })

        show_reports.append({
            "show_id": show.id,
            "title": show.title,
            "show_title": show.title,
            "slug": show.slug,
            "status": show.status.value,
            "section": show.section,
            "valid": show_val["valid"],
            "errors": show_val["errors"],
            "warnings": show_val["warnings"],
        })

    return {
        "can_publish": can_publish,
        "valid": can_publish,
        "total_shows_evaluated": len(shows),
        "blocking_issues_count": len(blocking_issues),
        "blocking_issues": blocking_issues,
        "draft_notices": draft_notices,
        "shows": show_reports,
    }