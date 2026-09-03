"""
Central place where all configuration is read from environment variables
(via a local .env file). Every other module imports `settings` from here
instead of calling os.getenv() directly.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    jwt_secret_key: str = "dev-secret-change-me"
    database_url: str = "sqlite:///./mediscan.db"
    frontend_origin: str = "http://localhost:5173"

    # Which Claude model to call for text + vision analysis
    claude_model: str = "claude-sonnet-4-6"

    # Local Ollama server (run `ollama serve`, default port 11434)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    # Vision-capable local model, used for the Injury Analyzer (photo in -> JSON out)
    ollama_vision_model: str = "llava"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
