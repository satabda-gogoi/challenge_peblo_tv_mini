from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PublishResponse(BaseModel):
    publish_run_id: int
    outcome: str
    shows_count: int
    episodes_count: int
    catalogue_uri: str | None = None
    error_message: str | None = None


class PublishRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    published_by: int
    started_at: datetime
    completed_at: datetime | None
    shows_count: int
    episodes_count: int
    outcome: str
    catalogue_uri: str | None
    error_message: str | None
    created_at: datetime