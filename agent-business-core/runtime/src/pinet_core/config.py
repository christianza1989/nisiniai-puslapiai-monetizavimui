from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from . import pricing


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="PINET_", extra="ignore")
    database_url: str = "postgresql+asyncpg://pinet_runtime:unset@127.0.0.1:15432/pinet"
    admin_database_url: str = ""
    edge_secret: str = ""
    worker_secret: str = ""
    operator_secret: str = ""
    # Local-only pilot: never enabled implicitly by legacy operator/worker secrets.
    control_enabled: bool = False
    control_mode: str = "local"
    control_bridge_secret: str = ""
    control_bridge_host: str = "control.pinet.internal"
    control_owner_user_id: str = ""
    control_cursor_secret: str = ""
    control_source_revision: str = ""
    control_session_seconds: int = 28800
    customer_enabled: bool = False
    customer_portal_origin: str = "http://127.0.0.1:3017"
    customer_outbox_directory: str = "artifacts/customer-outbox"
    public_projects_enabled: bool = False
    creation_enabled: bool = False
    creation_runner_enabled: bool = False
    # Zero disables the operator's daily ceiling; all attempts are still recorded.
    creation_daily_limit: int = Field(default=0, ge=0)
    creation_global_daily_limit: int = Field(default=0, ge=0)
    creation_runner_seconds: int = 180
    creation_workspace: str = ""
    creation_web_search_enabled: bool = False
    creation_language_review_enabled: bool = True
    chat_enabled: bool = False
    chat_operator_user_id: str = ""
    chat_daily_limit: int = 20
    chat_runner_enabled: bool = False
    chat_codex_executable: str = ""
    chat_codex_sha256: str = ""
    chat_workspace: str = ""
    chat_runner_seconds: int = 120
    chat_model: str = "gpt-6-luna"
    jev_api_key: SecretStr = SecretStr('')
    jev_budget_microusd: int = 150000
    jev_max_calls: int = 50
    jev_timeout_seconds: float = 1.5
    environment: str = "local"
    core_url: str = "http://127.0.0.1:8840"
    allow_simulation: bool = False
    learning_enabled: bool = False
    learning_namespace: str = ''
    voice_enabled: bool = False
    m0_verified: bool = False
    google_api_key: str = ""
    live_model: str = "gemini-3.8-live"
    analysis_model: str = "gemini-3.8-flash"
    livekit_url: str = "ws://127.0.0.1:7880"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    per_site_sessions: int = 3
    global_sessions: int = 6
    session_seconds: int = 900
    voice_heartbeat_seconds: float = 20
    per_site_daily_reserved_seconds: int = 7200
    global_daily_reserved_seconds: int = 21600
    global_daily_budget_microusd: int = 0
    voice_cost_ceiling_microusd: int = 0
    analysis_cost_ceiling_microusd: int = 0
    smtp_enabled: bool = False
    smtp_host: str = "smtp.hostinger.com"
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    sender_name: str = "MB Pinet"
    sender_email: str = "info@pinet.lt"
    lab_mail_enabled: bool = False
    lab_mail_recipient: str = ""
    imap_host: str = "imap.hostinger.com"
    imap_port: int = 993
    retention_days: int = 30
    knowledge_ttl_seconds: int = 180
    knowledge_refresh_seconds: int = 60
    knowledge_refresh_enabled: bool = False
    knowledge_source_base_url: str = ""
    knowledge_refresh_sites: list[str] = ["traktoriupadangos"]

    @property
    def voice_ready(self):
        return all((self.voice_enabled, self.m0_verified, self.google_api_key,
                    self.livekit_url, self.livekit_api_key, self.livekit_api_secret, not self.allow_simulation,
                    self.global_daily_budget_microusd > 0, self.voice_cost_ceiling_microusd > 0,
                    self.live_model == "gemini-3.8-live", pricing.current()))


@lru_cache
def settings():
    return Settings()
