from functools import lru_cache
from typing import Literal

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
    voice_sites: list[str] = ["traktoriupadangos"]
    voice_pilot_enabled: bool = False
    voice_pilot_sites: list[str] = []
    chat_enabled: bool = False
    chat_sites: list[str] = []
    chat_turn_cost_ceiling_microusd: int = 0
    m0_verified: bool = False
    m0_probe_enabled: bool = False
    google_api_key: str = ""
    live_model: str = "gemini-3.8-live"
    analysis_model: str = "gemini-3.8-flash"
    text_provider: Literal['gemini', 'openrouter'] = 'gemini'
    openrouter_api_key: SecretStr = Field(default=SecretStr(''), repr=False)
    openrouter_model: str = ''
    # Operator price ceilings (USD/M tokens), not a provider price card.
    openrouter_max_prompt_price: float = Field(default=0, ge=0, allow_inf_nan=False)
    openrouter_max_completion_price: float = Field(default=0, ge=0, allow_inf_nan=False)
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
    global_total_budget_microusd: int = 0
    voice_cost_ceiling_microusd: int = 0
    analysis_cost_ceiling_microusd: int = 0
    smtp_enabled: bool = False
    smtp_sites: list[str] = []
    smtp_recipient_allowlist: list[str] = []
    imap_enabled: bool = False
    imap_sites: list[str] = []
    imap_poll_seconds: int = 30
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
    # Operator-declared, per-site HTTPS deployment origins (e.g. a private preview).
    # The signed manifest must still match that site's canonical business mapping.
    knowledge_source_overrides: dict[str, str] = {}
    knowledge_refresh_sites: list[str] = ["traktoriupadangos"]

    @property
    def voice_provider_ready(self):
        return all((self.google_api_key,
                    self.livekit_url, self.livekit_api_key, self.livekit_api_secret, not self.allow_simulation,
                    self.global_daily_budget_microusd > 0, self.voice_cost_ceiling_microusd > 0,
                    self.live_model == "gemini-3.8-live", pricing.current()))

    @property
    def voice_ready(self):
        return self.voice_enabled and self.m0_verified and self.voice_provider_ready

    @property
    def voice_pilot_ready(self):
        return all((self.voice_pilot_enabled, self.voice_pilot_sites, self.m0_probe_enabled,
                    not self.voice_enabled, self.voice_provider_ready,
                    self.livekit_url.startswith('wss://')))

    @property
    def text_model(self):
        return self.openrouter_model if self.text_provider == 'openrouter' else self.analysis_model

    @property
    def text_engine(self):
        return f'openrouter:{self.openrouter_model}' if self.text_provider == 'openrouter' else self.analysis_model

    @property
    def text_provider_ready(self):
        if self.text_provider == 'openrouter':
            import re
            return bool(self.openrouter_api_key.get_secret_value()
                and re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.:-]+', self.openrouter_model)
                and not self.openrouter_model.startswith('openrouter/')
                and self.openrouter_max_prompt_price > 0 and self.openrouter_max_completion_price > 0)
        return bool(self.google_api_key and self.analysis_model == 'gemini-3.8-flash' and pricing.current())

    @property
    def chat_ready(self):
        return all((self.chat_enabled, self.text_provider_ready, not self.allow_simulation,
                    self.global_daily_budget_microusd > 0, self.chat_turn_cost_ceiling_microusd > 0,
                    self.text_provider in {'gemini', 'openrouter'}))


@lru_cache
def settings():
    return Settings()
