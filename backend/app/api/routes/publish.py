import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_admin, get_current_editor
from app.core.database import get_db
from app.models import PublishRun, User
from app.models.enums import PublishOutcome
from app.schemas.publish import (
    PublishResponse,
    PublishRunResponse,
)
from app.services.catalogue import generate_catalogue
from app.services.validation import validate_all


router = APIRouter(
    prefix="/publish",
    tags=["Publish"],
)


CATALOGUE_DIR = Path(__file__).resolve().parents[3] / "data" / "catalogue"
CATALOGUE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


@router.post(
    "",
    response_model=PublishResponse,
)
async def publish_catalogue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    started_at = datetime.now(timezone.utc)

    publish_run = PublishRun(
        published_by=current_user.id,
        started_at=started_at,
        outcome=PublishOutcome.FAILED,
        shows_count=0,
        episodes_count=0,
    )

    db.add(publish_run)
    await db.commit()
    await db.refresh(publish_run)

    # Validate everything
    validation = await validate_all(db)

    if not validation["valid"]:
        errors = []

        if not validation["shows"]:
            errors.append(
                "No published shows found. Mark at least one show as Published and add seasons and episodes before publishing."
            )
        else:
            for show in validation["shows"]:
                errors.extend(
                    issue["message"] if isinstance(issue, dict) else getattr(issue, "message", str(issue))
                    for issue in show["errors"]
                )

        publish_run.completed_at = datetime.now(timezone.utc)
        publish_run.outcome = PublishOutcome.FAILED
        publish_run.error_message = "; ".join(errors)

        await db.commit()

        return PublishResponse(
            publish_run_id=publish_run.id,
            outcome="failed",
            shows_count=0,
            episodes_count=0,
            error_message=publish_run.error_message,
        )


    # Promote DB records to PUBLISHED status during Admin publish run
    from app.models import Episode, Show
    from app.models.enums import EpisodeStatus, ShowStatus
    from sqlalchemy import update

    await db.execute(update(Show).values(status=ShowStatus.PUBLISHED))
    await db.execute(update(Episode).values(status=EpisodeStatus.PUBLISHED))
    await db.commit()

    # Generate catalogue
    catalogue = await generate_catalogue(db)

    shows_count = len(catalogue["shows"])

    episodes_count = sum(
        len(season["episodes"])
        for show in catalogue["shows"]
        for season in show["seasons"]
    )

    # 1. Format JSON payload
    json_data = json.dumps(
        catalogue,
        indent=2,
        ensure_ascii=False,
    )

    # 2. Save immutable versioned snapshot
    snapshot_filename = f"catalogue_{publish_run.id}.json"
    snapshot_path = CATALOGUE_DIR / snapshot_filename
    snapshot_path.write_text(json_data, encoding="utf-8")

    # 3. Atomic live file update: write to temp file then replace live catalogue.json
    live_catalogue_path = CATALOGUE_DIR / "catalogue.json"
    temp_catalogue_path = CATALOGUE_DIR / "catalogue.json.tmp"
    temp_catalogue_path.write_text(json_data, encoding="utf-8")
    temp_catalogue_path.replace(live_catalogue_path)

    # 4. Update publish run record
    publish_run.completed_at = datetime.now(timezone.utc)
    publish_run.shows_count = shows_count
    publish_run.episodes_count = episodes_count
    publish_run.outcome = PublishOutcome.SUCCESS
    publish_run.catalogue_uri = str(live_catalogue_path.resolve())

    await db.commit()

    return PublishResponse(
        publish_run_id=publish_run.id,
        outcome="success",
        shows_count=shows_count,
        episodes_count=episodes_count,
        catalogue_uri=str(live_catalogue_path.resolve()),
    )


@router.get(
    "/runs",
    response_model=list[PublishRunResponse],
)
async def get_publish_runs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(PublishRun)
        .order_by(PublishRun.id.desc())
    )

    return result.scalars().all()


@router.get(
    "/runs/{run_id}",
    response_model=PublishRunResponse,
)
async def get_publish_run(
    run_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(PublishRun).where(
            PublishRun.id == run_id
        )
    )

    publish_run = result.scalar_one_or_none()

    if publish_run is None:
        raise HTTPException(
            status_code=404,
            detail="Publish run not found",
        )

    return publish_run


@router.post(
    "/unpublish",
    response_model=PublishResponse,
)
async def unpublish_catalogue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    started_at = datetime.now(timezone.utc)

    # 1. Update DB records: revert all Shows and Episodes to DRAFT
    from app.models import Episode, Show
    from app.models.enums import EpisodeStatus, ShowStatus
    from sqlalchemy import update

    await db.execute(update(Show).values(status=ShowStatus.DRAFT))
    await db.execute(update(Episode).values(status=EpisodeStatus.DRAFT))

    # 2. Update previous SUCCESS runs to FAILED so get_catalogue doesn't serve old releases
    runs_result = await db.execute(
        select(PublishRun).where(PublishRun.outcome == PublishOutcome.SUCCESS)
    )
    for run in runs_result.scalars().all():
        run.outcome = PublishOutcome.FAILED
        run.error_message = "Unpublished by administrator"

    # 3. Add a new PublishRun record for the unpublish action
    publish_run = PublishRun(
        published_by=current_user.id,
        started_at=started_at,
        completed_at=datetime.now(timezone.utc),
        outcome=PublishOutcome.FAILED,
        shows_count=0,
        episodes_count=0,
        error_message="Catalogue unpublished by administrator",
    )
    db.add(publish_run)
    await db.commit()
    await db.refresh(publish_run)

    # 4. Remove live catalogue.json file
    live_catalogue_path = CATALOGUE_DIR / "catalogue.json"
    if live_catalogue_path.exists():
        live_catalogue_path.unlink()

    return PublishResponse(
        publish_run_id=publish_run.id,
        outcome="unpublished",
        shows_count=0,
        episodes_count=0,
        catalogue_uri=None,
        error_message=None,
    )
