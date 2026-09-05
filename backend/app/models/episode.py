from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Enum, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EpisodeStatus


class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[int] = mapped_column(primary_key=True)

    season_id: Mapped[int] = mapped_column(
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
    )

    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)

    status: Mapped[EpisodeStatus] = mapped_column(
        Enum(EpisodeStatus, name="episode_status"),
        default=EpisodeStatus.DRAFT,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("season_id", "episode_number"),
    )

    season: Mapped["Season"] = relationship(back_populates="episodes")

    content_group: Mapped["ContentGroup | None"] = relationship(
        back_populates="episode",
        uselist=False,
        cascade="all, delete-orphan",
    )

    artworks: Mapped[list["Artwork"]] = relationship(
        back_populates="episode",
        cascade="all, delete-orphan",
    )
    
    source_episode_id: Mapped[str | None] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
    )