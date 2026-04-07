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

    database_url: str = "sqlite:///./kloterby.db"

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

    next_public_api_base_url: str = "http://127.0.0.1:8001/api"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
