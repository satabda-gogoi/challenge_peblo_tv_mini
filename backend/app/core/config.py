from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):

    app_name: str = "Content Catalogue API"

    environment: str = "development"

    database_url: str = "sqlite:///data/catalogue/dev.db"

    jwt_secret: str = "dev-secret-key-for-jwt-tokens-peblo-tv-mini"

    model_config = SettingsConfigDict(
        env_file=[".env", str(ENV_PATH)],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url_sync(self) -> str:
        return self.database_url


settings = Settings()