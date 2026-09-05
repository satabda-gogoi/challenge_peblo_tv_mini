from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ContentGroup(Base):
    __tablename__ = "content_groups"

    id: Mapped[int] = mapped_column(primary_key=True)

    group_code: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    episode_id: Mapped[int] = mapped_column(
        ForeignKey("episodes.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    episode: Mapped["Episode"] = relationship(
        back_populates="content_group",
    )

    contents: Mapped[list["EpisodeContent"]] = relationship(
        back_populates="content_group",
        cascade="all, delete-orphan",
    )


class EpisodeContent(Base):
    __tablename__ = "episode_contents"

    id: Mapped[int] = mapped_column(primary_key=True)

    content_group_id: Mapped[int] = mapped_column(
        ForeignKey("content_groups.id", ondelete="CASCADE"),
        nullable=False,
    )

    language: Mapped[str] = mapped_column(String(10), nullable=False)
    video_uri: Mapped[str] = mapped_column(Text, nullable=False)

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
        UniqueConstraint("content_group_id", "language"),
    )

    content_group: Mapped["ContentGroup"] = relationship(
        back_populates="contents",
    )