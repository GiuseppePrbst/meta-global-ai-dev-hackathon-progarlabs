from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: SecretStr = SecretStr("")
    ai_provider: Literal["mock", "meta"] = "mock"
    model_api_key: SecretStr = SecretStr("")
    meta_timeout_seconds: float = Field(default=30, gt=0, le=120)
    cors_origins: list[str] = ["http://localhost:3000"]
