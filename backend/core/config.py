from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://urbanfurniture:urbanfurniture@localhost:5434/urbanfurniture"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    admin_email: str = "admin@urbanfurniture.dev"
    admin_password: str = "change-this-password"

    groq_api_key: str = ""


settings = Settings()
