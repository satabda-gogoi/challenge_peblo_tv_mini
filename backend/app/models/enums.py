from enum import Enum


class UserRole(str, Enum):
    EDITOR = "editor"
    ADMIN = "admin"


class ShowStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class EpisodeStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class ArtworkType(str, Enum):
    POSTER = "poster"
    BANNER = "banner"
    THUMBNAIL = "thumbnail"


class PublishOutcome(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"