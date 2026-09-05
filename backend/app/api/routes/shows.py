from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Category, Show, User
from app.models.enums import ShowStatus, UserRole
from app.schemas.show import ShowCreate, ShowResponse, ShowUpdate
from app.api.dependencies import get_current_editor
from app.services.catalogue import sync_published_catalogue


router = APIRouter(prefix="/shows", tags=["Shows"])


@router.get("", response_model=list[ShowResponse])
async def get_shows(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Show)
        .options(selectinload(Show.categories))
        .order_by(Show.id)
    )

    shows = result.scalars().all()

    return [
        ShowResponse(
            id=show.id,
            title=show.title,
            slug=show.slug,
            synopsis=show.synopsis,
            section=show.section,
            status=show.status.value,
            created_at=show.created_at,
            updated_at=show.updated_at,
            categories=[category.name for category in show.categories],
        )
        for show in shows
    ]


@router.get("/{show_id}", response_model=ShowResponse)
async def get_show(
    show_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Show)
        .options(selectinload(Show.categories))
        .where(Show.id == show_id)
    )

    show = result.scalar_one_or_none()

    if show is None:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    return ShowResponse(
        id=show.id,
        title=show.title,
        slug=show.slug,
        synopsis=show.synopsis,
        section=show.section,
        status=show.status.value,
        created_at=show.created_at,
        updated_at=show.updated_at,
        categories=[category.name for category in show.categories],
    )
    
@router.post("", response_model=ShowResponse, status_code=201)
async def create_show(
    data: ShowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    # Check slug
    result = await db.execute(
        select(Show).where(Show.slug == data.slug)
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="A show with this slug already exists",
        )

    # Determine show status (Editors can only create DRAFT shows; only Admins can set PUBLISHED)
    initial_status = ShowStatus.DRAFT
    if current_user.role == UserRole.ADMIN and data.status:
        try:
            initial_status = ShowStatus(data.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid show status: '{data.status}'",
            )

    # Create show
    show = Show(
        title=data.title,
        slug=data.slug,
        synopsis=data.synopsis,
        section=data.section,
        status=initial_status,
        categories=[],
    )

    db.add(show)
    await db.flush()

    # Add categories
    if data.category_ids:
        result = await db.execute(
            select(Category).where(
                Category.id.in_(data.category_ids)
            )
        )

        categories = result.scalars().all()

        if len(categories) != len(set(data.category_ids)):
            raise HTTPException(
                status_code=400,
                detail="One or more category IDs are invalid",
            )

        show.categories = categories

    await db.commit()

    # Reload with categories
    result = await db.execute(
        select(Show)
        .options(selectinload(Show.categories))
        .where(Show.id == show.id)
    )

    show = result.scalar_one()

    return ShowResponse(
        id=show.id,
        title=show.title,
        slug=show.slug,
        synopsis=show.synopsis,
        section=show.section,
        status=show.status.value,
        created_at=show.created_at,
        updated_at=show.updated_at,
        categories=[category.name for category in show.categories],
    )


@router.put("/{show_id}", response_model=ShowResponse)
async def update_show(
    show_id: int,
    data: ShowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Show)
        .options(selectinload(Show.categories))
        .where(Show.id == show_id)
    )

    show = result.scalar_one_or_none()

    if show is None:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    if data.slug is not None and data.slug != show.slug:
        result = await db.execute(
            select(Show).where(
                Show.slug == data.slug,
                Show.id != show_id,
            )
        )

        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="A show with this slug already exists",
            )

        show.slug = data.slug

    if data.title is not None:
        show.title = data.title

    if data.synopsis is not None:
        show.synopsis = data.synopsis

    if data.section is not None:
        show.section = data.section

    if data.category_ids is not None:
        result = await db.execute(
            select(Category).where(
                Category.id.in_(data.category_ids)
            )
        )

        categories = result.scalars().all()

        if len(categories) != len(set(data.category_ids)):
            raise HTTPException(
                status_code=400,
                detail="One or more category IDs are invalid",
            )

        show.categories = categories

    if data.status is not None and data.status != show.status.value:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=403,
                detail="Only administrators can update show status to published",
            )
        try:
            show.status = ShowStatus(data.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid show status: '{data.status}'",
            )

    await db.commit()

    # Reload relationships
    result = await db.execute(
        select(Show)
        .options(selectinload(Show.categories))
        .where(Show.id == show_id)
    )

    show = result.scalar_one()

    return ShowResponse(
        id=show.id,
        title=show.title,
        slug=show.slug,
        synopsis=show.synopsis,
        section=show.section,
        status=show.status.value,
        created_at=show.created_at,
        updated_at=show.updated_at,
        categories=[category.name for category in show.categories],
    )


@router.delete("/{show_id}", status_code=204)
async def delete_show(
    show_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Show).where(Show.id == show_id)
    )

    show = result.scalar_one_or_none()

    if show is None:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    await db.delete(show)
    await db.commit()