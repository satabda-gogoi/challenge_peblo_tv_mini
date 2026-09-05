from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ContentCreate(BaseModel):
    language: str = Field(pattern="^(en|hi)$")
    video_uri: str = Field(min_length=1, max_length=1000)


class ContentUpdate(BaseModel):
    language: str | None = Field(default=None, pattern="^(en|hi)$")
    video_uri: str | None = Field(default=None, min_length=1, max_length=1000)


class ContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_group_id: int
    language: str
    video_uri: str
    created_at: datetime
    updated_at: datetime