from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ShowStatus


class Show(Base):
    __tablename__ = "shows"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    synopsis: Mapped[str | None] = mapped_column(Text)
    section: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[ShowStatus] = mapped_column(
        Enum(ShowStatus, name="show_status"),
        default=ShowStatus.DRAFT,
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

    seasons: Mapped[list["Season"]] = relationship(
        back_populates="show",
        cascade="all, delete-orphan",
    )

    categories: Mapped[list["Category"]] = relationship(
        secondary="show_categories",
        back_populates="shows",
    )