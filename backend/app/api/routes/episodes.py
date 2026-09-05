from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_editor
from app.core.database import get_db
from app.models import Episode, Season, User
from app.models.enums import EpisodeStatus
from app.schemas.episode import (
    EpisodeCreate,
    EpisodeResponse,
    EpisodeUpdate,
)


router = APIRouter(tags=["Episodes"])


@router.get(
    "/seasons/{season_id}/episodes",
    response_model=list[EpisodeResponse],
)
async def get_episodes(
    season_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Season).where(Season.id == season_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=404,
            detail="Season not found",
        )

    result = await db.execute(
        select(Episode)
        .where(Episode.season_id == season_id)
        .order_by(Episode.episode_number)
    )

    return result.scalars().all()


@router.get(
    "/episodes/{episode_id}",
    response_model=EpisodeResponse,
)
async def get_episode(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )

    episode = result.scalar_one_or_none()

    if episode is None:
        raise HTTPException(
            status_code=404,
            detail="Episode not found",
        )

    return episode


@router.post(
    "/seasons/{season_id}/episodes",
    response_model=EpisodeResponse,
    status_code=201,
)
async def create_episode(
    season_id: int,
    data: EpisodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    # Check season exists
    result = await db.execute(
        select(Season).where(Season.id == season_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=404,
            detail="Season not found",
        )

    # Check duplicate episode number
    result = await db.execute(
        select(Episode).where(
            Episode.season_id == season_id,
            Episode.episode_number == data.episode_number,
        )
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This episode number already exists in the season",
        )

    # Check duplicate source_episode_id if provided
    if data.source_episode_id:
        result = await db.execute(
            select(Episode).where(
                Episode.source_episode_id == data.source_episode_id
            )
        )

        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="An episode with this source_episode_id already exists",
            )

    initial_status = EpisodeStatus.DRAFT
    if data.status:
        try:
            initial_status = EpisodeStatus(data.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid episode status: '{data.status}'",
            )

    episode = Episode(
        season_id=season_id,
        source_episode_id=data.source_episode_id,
        episode_number=data.episode_number,
        title=data.title,
        description=data.description,
        duration_seconds=data.duration_seconds,
        status=initial_status,
    )

    db.add(episode)
    await db.commit()
    await db.refresh(episode)

    return episode


@router.put(
    "/episodes/{episode_id}",
    response_model=EpisodeResponse,
)
async def update_episode(
    episode_id: int,
    data: EpisodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )

    episode = result.scalar_one_or_none()

    if episode is None:
        raise HTTPException(
            status_code=404,
            detail="Episode not found",
        )

    if data.episode_number is not None:
        result = await db.execute(
            select(Episode).where(
                Episode.season_id == episode.season_id,
                Episode.episode_number == data.episode_number,
                Episode.id != episode_id,
            )
        )

        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="This episode number already exists in the season",
            )

        episode.episode_number = data.episode_number

    if data.source_episode_id is not None and data.source_episode_id != episode.source_episode_id:
        result = await db.execute(
            select(Episode).where(
                Episode.source_episode_id == data.source_episode_id,
                Episode.id != episode_id,
            )
        )

        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="An episode with this source_episode_id already exists",
            )

        episode.source_episode_id = data.source_episode_id

    if data.title is not None:
        episode.title = data.title

    if data.description is not None:
        episode.description = data.description

    if data.duration_seconds is not None:
        episode.duration_seconds = data.duration_seconds

    if data.status is not None:
        try:
            episode.status = EpisodeStatus(data.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid episode status: '{data.status}'",
            )

    await db.commit()
    await db.refresh(episode)

    return episode


@router.delete("/episodes/{episode_id}", status_code=204)
async def delete_episode(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )

    episode = result.scalar_one_or_none()

    if episode is None:
        raise HTTPException(
            status_code=404,
            detail="Episode not found",
        )

    await db.delete(episode)
    await db.commit()