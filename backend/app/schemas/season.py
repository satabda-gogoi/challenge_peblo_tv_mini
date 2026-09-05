from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SeasonCreate(BaseModel):
    season_number: int = Field(ge=0)


class SeasonUpdate(BaseModel):
    season_number: int = Field(ge=0)


class SeasonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    show_id: int
    season_number: int
    created_at: datetime