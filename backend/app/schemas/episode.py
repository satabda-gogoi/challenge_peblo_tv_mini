from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EpisodeCreate(BaseModel):
    episode_number: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    source_episode_id: str | None = None


class EpisodeUpdate(BaseModel):
    episode_number: int | None = Field(default=None, gt=0)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    source_episode_id: str | None = None
    status: str | None = None



class EpisodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    season_id: int
    source_episode_id: str | None
    episode_number: int
    title: str
    description: str | None
    duration_seconds: int | None
    status: str
    created_at: datetime
    updated_at: datetime