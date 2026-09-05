import json
import sys
from pathlib import Path

# Ensure backend root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models import (
    Artwork,
    Category,
    ContentGroup,
    Episode,
    EpisodeContent,
    Season,
    Show,
    User,
    show_categories,
)
from app.models.enums import ArtworkType, EpisodeStatus, ShowStatus, UserRole

SEED_FILE = PROJECT_ROOT / "data" / "seeds_shows.json"


def seed():
    print(f"Loading seed data from: {SEED_FILE}")

    with SEED_FILE.open("r", encoding="utf-8") as file:
        records = json.load(file)

    engine = create_engine(settings.database_url_sync)
    with Session(engine) as session:
        # ---------------------------------------------------------
        # 0. Ensure admin and editor users exist
        # ---------------------------------------------------------
        result = session.execute(
            select(User).where(User.username == "admin")
        )
        admin_user = result.scalar_one_or_none()
        if admin_user is None:
            admin_user = User(
                username="admin",
                full_name="Administrator",
                email="admin@example.com",
                password_hash=hash_password("admin123"),
                role=UserRole.ADMIN,
            )
            session.add(admin_user)
            session.flush()
            print("Admin user seeded: admin / admin123")
        else:
            admin_user.role = UserRole.ADMIN

        result = session.execute(
            select(User).where(User.username == "editor")
        )
        editor_user = result.scalar_one_or_none()
        if editor_user is None:
            editor_user = User(
                username="editor",
                full_name="Staff Editor",
                email="editor@example.com",
                password_hash=hash_password("editor123"),
                role=UserRole.EDITOR,
            )
            session.add(editor_user)
            session.flush()
            print("Editor user seeded: editor / editor123")
        else:
            editor_user.role = UserRole.EDITOR

        # ---------------------------------------------------------
        # 1. Create categories
        # ---------------------------------------------------------
        category_names = sorted(
            {
                category
                for record in records
                for category in record.get("categories", [])
            }
        )

        categories = {}

        for name in category_names:
            result = session.execute(
                select(Category).where(Category.name == name)
            )
            category = result.scalar_one_or_none()

            if category is None:
                category = Category(name=name)
                session.add(category)
                session.flush()

            categories[name] = category

        print(f"Categories ready: {len(categories)}")

        # ---------------------------------------------------------
        # 2. Group records by show slug
        # ---------------------------------------------------------
        shows_data = {}

        for record in records:
            slug = record["slug"]

            if slug not in shows_data:
                shows_data[slug] = record

        # ---------------------------------------------------------
        # 3. Create shows
        # ---------------------------------------------------------
        shows = {}

        for slug, record in shows_data.items():
            result = session.execute(
                select(Show).where(Show.slug == slug)
            )
            show = result.scalar_one_or_none()

            # A show is published if any episodes are published and section is present
            is_published = (
                any(r.get("status") == "published" for r in records if r["slug"] == slug)
                and bool(record.get("section"))
            )
            target_status = ShowStatus.PUBLISHED if is_published else ShowStatus.DRAFT

            if show is None:
                show = Show(
                    title=record["show_title"],
                    slug=slug,
                    synopsis=record.get("synopsis"),
                    section=record.get("section"),
                    status=target_status,
                )
                session.add(show)
                session.flush()
            else:
                show.title = record["show_title"]
                show.synopsis = record.get("synopsis")
                show.section = record.get("section")
                show.status = target_status

            shows[slug] = show

            # Add categories
            for category_name in record.get("categories", []):
                category = categories[category_name]

                exists = session.execute(
                    select(show_categories).where(
                        show_categories.c.show_id == show.id,
                        show_categories.c.category_id == category.id,
                    )
                )

                if exists.first() is None:
                    session.execute(
                        show_categories.insert().values(
                            show_id=show.id,
                            category_id=category.id,
                        )
                    )

        print(f"Shows ready: {len(shows)}")

        # ---------------------------------------------------------
        # 4. Group records by logical episode
        #
        # content_group identifies language variants of the same
        # logical episode.
        # ---------------------------------------------------------
        episode_groups = {}

        for record in records:
            group_code = record["content_group"]
            episode_groups.setdefault(group_code, []).append(record)

        # ---------------------------------------------------------
        # 5. Create seasons, episodes, content groups,
        #    episode contents and artworks
        # ---------------------------------------------------------
        season_cache = {}

        for group_code, variants in episode_groups.items():
            first = variants[0]

            show = shows[first["slug"]]

            season_key = (
                show.id,
                first["season_number"],
            )

            # ---------------------------------------------
            # Season
            # ---------------------------------------------
            if season_key not in season_cache:
                result =  session.execute(
                    select(Season).where(
                        Season.show_id == show.id,
                        Season.season_number == first["season_number"],
                    )
                )

                season = result.scalar_one_or_none()

                if season is None:
                    season = Season(
                        show_id=show.id,
                        season_number=first["season_number"],
                    )
                    session.add(season)
                    session.flush()

                season_cache[season_key] = season

            season = season_cache[season_key]

            # ---------------------------------------------
            # Episode
            # ---------------------------------------------
            result =  session.execute(
                select(Episode).where(
                    Episode.season_id == season.id,
                    Episode.episode_number == first["episode_number"],
                )
            )

            episode = result.scalar_one_or_none()

            # Prefer English variant for the main episode metadata
            english_variant = next(
                (
                    record
                    for record in variants
                    if record["language"] == "en"
                ),
                first,
            )

            if episode is None:
                episode = Episode(
                    season_id=season.id,
                    source_episode_id=english_variant["episode_id"],
                    episode_number=first["episode_number"],
                    title=english_variant["episode_title"],
                    description=None,
                    duration_seconds=english_variant.get(
                        "duration_seconds"
                    ),
                    status=(
                        EpisodeStatus.PUBLISHED
                        if all(
                            record["status"] == "published"
                            for record in variants
                        )
                        else EpisodeStatus.DRAFT
                    ),
                )

                session.add(episode)
                session.flush()

            # ---------------------------------------------
            # Content Group
            # ---------------------------------------------
            result =  session.execute(
                select(ContentGroup).where(
                    ContentGroup.episode_id == episode.id
                )
            )

            content_group = result.scalar_one_or_none()

            if content_group is None:
                content_group = ContentGroup(
                    episode_id=episode.id,
                    group_code=group_code,
                )
                session.add(content_group)
                session.flush()

            # ---------------------------------------------
            # Episode contents
            # ---------------------------------------------
            for record in variants:
                language = record["language"]

                result =  session.execute(
                    select(EpisodeContent).where(
                        EpisodeContent.content_group_id
                        == content_group.id,
                        EpisodeContent.language == language,
                    )
                )

                existing_content = result.scalar_one_or_none()

                if existing_content is None:
                    content = EpisodeContent(
                        content_group_id=content_group.id,
                        language=language,
                        video_uri=(
                            f"seed://video/{record['episode_id']}"
                        ),
                    )
                    session.add(content)

            # ---------------------------------------------
            # Artwork
            #
            # artwork_available is the fixture's availability
            # information, not actual file URLs.
            # ---------------------------------------------
            artwork_types = set()

            for record in variants:
                artwork_types.update(
                    record.get("artwork_available", [])
                )

            artwork_dimensions = {
                ArtworkType.POSTER: (600, 900),
                ArtworkType.BANNER: (1280, 720),
                ArtworkType.THUMBNAIL: (640, 360),
            }

            for artwork_name in artwork_types:
                artwork_type = ArtworkType(artwork_name)

                result =  session.execute(
                    select(Artwork).where(
                        Artwork.episode_id == episode.id,
                        Artwork.type == artwork_type,
                    )
                )

                existing_artwork = result.scalar_one_or_none()

                if existing_artwork is None:
                    width, height = artwork_dimensions[artwork_type]

                    artwork = Artwork(
                        episode_id=episode.id,
                        type=artwork_type,
                        storage_uri=(
                            f"seed://artwork/"
                            f"{episode.source_episode_id}/"
                            f"{artwork_name}"
                        ),
                        alt_text=f"{episode.title} {artwork_name}",
                        width=width,
                        height=height,
                        size_bytes=100_000,
                        mime_type="image/jpeg",
                    )

                    session.add(artwork)

        session.commit()

        # ---------------------------------------------------------
        # Summary
        # ---------------------------------------------------------
        show_count = (
             session.execute(select(Show))
        ).scalars().all()

        season_count = (
             session.execute(select(Season))
        ).scalars().all()

        episode_count = (
             session.execute(select(Episode))
        ).scalars().all()

        content_count = (
             session.execute(select(EpisodeContent))
        ).scalars().all()

        artwork_count = (
             session.execute(select(Artwork))
        ).scalars().all()

        print()
        print("================================")
        print("Seed completed successfully")
        print("================================")
        print(f"Shows:            {len(show_count)}")
        print(f"Seasons:          {len(season_count)}")
        print(f"Logical episodes: {len(episode_count)}")
        print(f"Language contents:{len(content_count)}")
        print(f"Artwork records:  {len(artwork_count)}")
        print("================================")


if __name__ == "__main__":
    seed()