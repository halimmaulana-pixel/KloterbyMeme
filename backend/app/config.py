from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "Kloterby Meme API"
    app_env: str = "development"
    app_debug: bool = True
    api_v1_prefix: str = "/api"

    # Default to data/ directory for persistence in Railway Volumes
    database_url: str = "sqlite:///./data/kloterby.db"

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.database_url
        if not url or url.strip() == "":
            return "sqlite:///./data/kloterby.db"
        
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://"):
            # Ensure we use psycopg (v3) which is in requirements.txt
            if "+psycopg" not in url:
                return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440

    redis_url: str = "redis://localhost:6379/0"

    storage_driver: str = "local"
    storage_bucket: str = "kloterby-meme"
    storage_region: str = "ap-southeast-1"
    storage_access_key: str = ""
    storage_secret_key: str = ""

    wa_provider: str = "fonnte"
    wa_base_url: str = "https://api.fonnte.com"
    wa_token: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
