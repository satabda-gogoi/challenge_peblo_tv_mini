from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_editor
from app.core.database import get_db
from app.models import User
from app.schemas.validation import ValidationResponse
from app.services.validation import (
    validate_all,
    validate_episode,
    validate_show,
    get_validation_report,
)


router = APIRouter(
    tags=["Validation"],
)


@router.get(
    "/shows/{show_id}/validation",
    response_model=ValidationResponse,
)
async def get_show_validation(
    show_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    return await validate_show(db=db, show_id=show_id)


@router.get(
    "/episodes/{episode_id}/validation",
    response_model=ValidationResponse,
)
async def get_episode_validation(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    return await validate_episode(db=db, episode_id=episode_id)


@router.get("/validation")
async def get_all_validation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    return await validate_all(db)


@router.get("/admin/validation-report")
@router.get("/validation/report")
async def get_admin_validation_report_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    return await get_validation_report(db)