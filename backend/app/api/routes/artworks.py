import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_editor
from app.core.database import get_db
from app.core.storage import get_storage_service
from app.models import Artwork, Episode, User
from app.models.enums import ArtworkType
from app.schemas.artwork import (
    ArtworkCreate,
    ArtworkResponse,
    ArtworkUpdate,
)
from app.services.artwork_validator import validate_artwork_image


router = APIRouter(tags=["Artwork"])


@router.get(
    "/episodes/{episode_id}/artworks",
    response_model=list[ArtworkResponse],
)
async def get_artworks(
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
        select(Artwork)
        .where(Artwork.episode_id == episode_id)
        .order_by(Artwork.type)
    )

    return result.scalars().all()


@router.post(
    "/episodes/{episode_id}/artworks",
    response_model=ArtworkResponse,
    status_code=201,
)
async def create_artwork(
    episode_id: int,
    data: ArtworkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    # Check episode
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=404,
            detail="Episode not found",
        )

    # Check duplicate artwork type
    artwork_type = ArtworkType(data.type)

    result = await db.execute(
        select(Artwork).where(
            Artwork.episode_id == episode_id,
            Artwork.type == artwork_type,
        )
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This artwork type already exists for the episode",
        )

    artwork = Artwork(
        episode_id=episode_id,
        type=artwork_type,
        storage_uri=data.storage_uri,
        alt_text=data.alt_text,
        width=data.width,
        height=data.height,
        size_bytes=data.size_bytes,
        mime_type=data.mime_type,
    )

    db.add(artwork)
    await db.commit()
    await db.refresh(artwork)

    return artwork


@router.put(
    "/artworks/{artwork_id}",
    response_model=ArtworkResponse,
)
async def update_artwork(
    artwork_id: int,
    data: ArtworkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Artwork).where(Artwork.id == artwork_id)
    )

    artwork = result.scalar_one_or_none()

    if artwork is None:
        raise HTTPException(
            status_code=404,
            detail="Artwork not found",
        )

    if data.type is not None:
        new_type = ArtworkType(data.type)

        if new_type != artwork.type:
            result = await db.execute(
                select(Artwork).where(
                    Artwork.episode_id == artwork.episode_id,
                    Artwork.type == new_type,
                    Artwork.id != artwork_id,
                )
            )

            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=409,
                    detail="This artwork type already exists for the episode",
                )

            artwork.type = new_type

    if data.storage_uri is not None:
        artwork.storage_uri = data.storage_uri

    if data.alt_text is not None:
        artwork.alt_text = data.alt_text

    if data.width is not None:
        artwork.width = data.width

    if data.height is not None:
        artwork.height = data.height

    if data.size_bytes is not None:
        artwork.size_bytes = data.size_bytes

    if data.mime_type is not None:
        artwork.mime_type = data.mime_type

    await db.commit()
    await db.refresh(artwork)

    return artwork


@router.delete("/artworks/{artwork_id}", status_code=204)
async def delete_artwork(
    artwork_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    result = await db.execute(
        select(Artwork).where(Artwork.id == artwork_id)
    )

    artwork = result.scalar_one_or_none()

    if artwork is None:
        raise HTTPException(
            status_code=404,
            detail="Artwork not found",
        )

    await db.delete(artwork)
    await db.commit()


@router.post(
    "/episodes/{episode_id}/artworks/upload",
    response_model=ArtworkResponse,
    status_code=201,
)
async def upload_artwork(
    episode_id: int,
    file: UploadFile = File(...),
    type: str = Form(...),
    alt_text: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    """
    Upload and validate an artwork image according to reference.json specifications.
    Validates aspect ratio (2:3 poster, 16:9 banner/thumb), dimensions, and 200 KB ceiling.
    Stores the validated image via the StorageService abstraction.
    """
    # Verify episode exists
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Episode not found")

    clean_type = type.lower().strip()
    try:
        art_type_enum = ArtworkType(clean_type)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid artwork type '{type}'. Allowed types: poster, banner, thumbnail",
        )

    # Read and validate image
    file_bytes = await file.read()
    val_res = validate_artwork_image(file_bytes, clean_type, file.filename or "")
    if not val_res.valid:
        raise HTTPException(status_code=422, detail=val_res.error)

    # Save via storage service
    storage = get_storage_service()
    ext = (val_res.format or "jpg").lower()
    if ext == "jpeg":
        ext = "jpg"
    key = f"episodes/{episode_id}/{clean_type}_{uuid.uuid4().hex[:8]}.{ext}"
    uri = await storage.save_file(file_bytes, key, content_type=val_res.mime_type or "image/jpeg")

    # Check existing artwork record for this slot
    existing_result = await db.execute(
        select(Artwork).where(
            Artwork.episode_id == episode_id,
            Artwork.type == art_type_enum,
        )
    )
    artwork = existing_result.scalar_one_or_none()

    if artwork is None:
        artwork = Artwork(
            episode_id=episode_id,
            type=art_type_enum,
            storage_uri=uri,
            alt_text=alt_text or f"{clean_type.capitalize()} artwork for episode {episode_id}",
            width=val_res.width,
            height=val_res.height,
            size_bytes=val_res.size_bytes,
            mime_type=val_res.mime_type,
        )
        db.add(artwork)
    else:
        # Update existing slot with new file
        artwork.storage_uri = uri
        artwork.width = val_res.width
        artwork.height = val_res.height
        artwork.size_bytes = val_res.size_bytes
        artwork.mime_type = val_res.mime_type
        if alt_text:
            artwork.alt_text = alt_text

    await db.commit()
    await db.refresh(artwork)
    return artwork