from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArtworkCreate(BaseModel):
    type: str = Field(pattern="^(poster|banner|thumbnail)$")
    storage_uri: str = Field(min_length=1, max_length=1000)
    alt_text: str | None = None
    width: int | None = Field(default=None, gt=0)
    height: int | None = Field(default=None, gt=0)
    size_bytes: int | None = Field(default=None, gt=0)
    mime_type: str | None = Field(default=None, max_length=100)


class ArtworkUpdate(BaseModel):
    type: str | None = Field(
        default=None,
        pattern="^(poster|banner|thumbnail)$",
    )
    storage_uri: str | None = Field(
        default=None,
        min_length=1,
        max_length=1000,
    )
    alt_text: str | None = None
    width: int | None = Field(default=None, gt=0)
    height: int | None = Field(default=None, gt=0)
    size_bytes: int | None = Field(default=None, gt=0)
    mime_type: str | None = Field(default=None, max_length=100)


class ArtworkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    episode_id: int
    type: str
    storage_uri: str
    alt_text: str | None
    width: int | None
    height: int | None
    size_bytes: int | None
    mime_type: str | None
    created_at: datetime
    updated_at: datetime