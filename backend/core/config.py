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

    # Background jobs (Ledger Integrity Check, Bulk Invoice PDF Export) run through
    # this Redis-backed queue, separate from the request/response cycle.
    redis_url: str = "redis://localhost:6380/0"

    # Contact-role users pay their own Customer Invoice online through Razorpay
    # test mode. Empty by default - checkout fails loudly until these are set,
    # instead of silently doing nothing.
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""


settings = Settings()
