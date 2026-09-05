from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_editor
from app.core.database import get_db
from app.models import Category, User
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)


router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)


@router.get("", response_model=list[CategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).order_by(Category.name)
    )

    return result.scalars().all()


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=201,
)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Category).where(Category.name == data.name)
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists",
        )

    category = Category(name=data.name)

    db.add(category)
    await db.commit()
    await db.refresh(category)

    return category


@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
)
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )

    category = result.scalar_one_or_none()

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    if data.name != category.name:
        result = await db.execute(
            select(Category).where(
                Category.name == data.name,
                Category.id != category_id,
            )
        )

        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="A category with this name already exists",
            )

        category.name = data.name

    await db.commit()
    await db.refresh(category)

    return category


@router.delete(
    "/{category_id}",
    status_code=204,
)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )

    category = result.scalar_one_or_none()

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    await db.delete(category)
    await db.commit()