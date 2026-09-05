from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ShowBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    synopsis: str | None = None
    section: str | None = None


class ShowCreate(ShowBase):
    category_ids: list[int] = Field(default_factory=list)


class ShowUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    synopsis: str | None = None
    section: str | None = None
    category_ids: list[int] | None = None
    status: str | None = None


class ShowResponse(ShowBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    categories: list[str] = []