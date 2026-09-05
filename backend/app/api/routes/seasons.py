from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_editor
from app.core.database import get_db
from app.models import Season, Show, User
from app.schemas.season import SeasonCreate, SeasonResponse, SeasonUpdate


router = APIRouter(tags=["Seasons"])


@router.get("/shows/{show_id}/seasons", response_model=list[SeasonResponse])
async def get_seasons(
    show_id: int,
    db: AsyncSession = Depends(get_db),
):
    # Check show exists
    result = await db.execute(
        select(Show).where(Show.id == show_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    result = await db.execute(
        select(Season)
        .where(Season.show_id == show_id)
        .order_by(Season.season_number)
    )

    return result.scalars().all()


@router.post(
    "/shows/{show_id}/seasons",
    response_model=SeasonResponse,
    status_code=201,
)
async def create_season(
    show_id: int,
    data: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    # Check show exists
    result = await db.execute(
        select(Show).where(Show.id == show_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    # Check duplicate season number
    result = await db.execute(
        select(Season).where(
            Season.show_id == show_id,
            Season.season_number == data.season_number,
        )
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This season number already exists for the show",
        )

    season = Season(
        show_id=show_id,
        season_number=data.season_number,
    )

    db.add(season)
    await db.commit()
    await db.refresh(season)

    return season


@router.put(
    "/seasons/{season_id}",
    response_model=SeasonResponse,
)
async def update_season(
    season_id: int,
    data: SeasonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Season).where(Season.id == season_id)
    )

    season = result.scalar_one_or_none()

    if season is None:
        raise HTTPException(
            status_code=404,
            detail="Season not found",
        )

    # Check duplicate season number
    result = await db.execute(
        select(Season).where(
            Season.show_id == season.show_id,
            Season.season_number == data.season_number,
            Season.id != season_id,
        )
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This season number already exists for the show",
        )

    season.season_number = data.season_number

    await db.commit()
    await db.refresh(season)

    return season


@router.delete("/seasons/{season_id}", status_code=204)
async def delete_season(
    season_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Season).where(Season.id == season_id)
    )

    season = result.scalar_one_or_none()

    if season is None:
        raise HTTPException(
            status_code=404,
            detail="Season not found",
        )

    await db.delete(season)
    await db.commit()