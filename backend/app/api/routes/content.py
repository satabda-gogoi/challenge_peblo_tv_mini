from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_editor
from app.core.database import get_db
from app.models import ContentGroup, Episode, EpisodeContent, User
from app.schemas.content import ContentCreate, ContentResponse, ContentUpdate


router = APIRouter(tags=["Episode Contents"])


@router.get(
    "/episodes/{episode_id}/contents",
    response_model=list[ContentResponse],
)
async def get_contents(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=404,
            detail="Episode not found",
        )

    result = await db.execute(
        select(EpisodeContent)
        .join(ContentGroup)
        .where(ContentGroup.episode_id == episode_id)
        .order_by(EpisodeContent.language)
    )

    return result.scalars().all()


@router.post(
    "/episodes/{episode_id}/contents",
    response_model=ContentResponse,
    status_code=201,
)
async def create_content(
    episode_id: int,
    data: ContentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    # Check episode exists
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=404,
            detail="Episode not found",
        )

    # Get or create content group
    result = await db.execute(
        select(ContentGroup).where(
            ContentGroup.episode_id == episode_id
        )
    )

    content_group = result.scalar_one_or_none()

    if content_group is None:
        content_group = ContentGroup(
            episode_id=episode_id,
            group_code=f"grp_ep_{episode_id}",
        )
        db.add(content_group)
        await db.flush()

    # Check language already exists
    result = await db.execute(
        select(EpisodeContent).where(
            EpisodeContent.content_group_id == content_group.id,
            EpisodeContent.language == data.language,
        )
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This language already exists for the episode",
        )

    content = EpisodeContent(
        content_group_id=content_group.id,
        language=data.language,
        video_uri=data.video_uri,
    )

    db.add(content)
    await db.commit()
    await db.refresh(content)

    return content


@router.put(
    "/contents/{content_id}",
    response_model=ContentResponse,
)
async def update_content(
    content_id: int,
    data: ContentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(EpisodeContent).where(
            EpisodeContent.id == content_id
        )
    )

    content = result.scalar_one_or_none()

    if content is None:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    if data.language is not None and data.language != content.language:
        result = await db.execute(
            select(EpisodeContent).where(
                EpisodeContent.content_group_id == content.content_group_id,
                EpisodeContent.language == data.language,
                EpisodeContent.id != content_id,
            )
        )

        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="This language already exists for the episode",
            )

        content.language = data.language

    if data.video_uri is not None:
        content.video_uri = data.video_uri

    await db.commit()
    await db.refresh(content)

    return content


@router.delete("/contents/{content_id}", status_code=204)
async def delete_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(EpisodeContent).where(
            EpisodeContent.id == content_id
        )
    )

    content = result.scalar_one_or_none()

    if content is None:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    await db.delete(content)
    await db.commit()