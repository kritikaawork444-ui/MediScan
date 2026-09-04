"""
Central place where all configuration is read from environment variables
(via a local .env file). Every other module imports `settings` from here
instead of calling os.getenv() directly.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    jwt_secret_key: str = "dev-secret-change-me"
    database_url: str = "sqlite:///./mediscan.db"
    frontend_origin: str = "http://localhost:5173"

    # Legacy keys ignored (app runs fully offline / local ML — no Ollama required)
    anthropic_api_key: str = ""
    claude_model: str = ""
    ollama_base_url: str = ""
    ollama_model: str = ""
    ollama_vision_model: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
