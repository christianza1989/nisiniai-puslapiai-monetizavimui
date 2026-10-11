import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_private_env(path=ROOT / ".env"):
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


@dataclass
class Config:
    data: Path = field(default_factory=lambda: ROOT / "data")
    token: str = field(default="", repr=False)
    operator_key: str = field(default="", repr=False)
    timezone: str = "Europe/Vilnius"
    codex_enabled: bool = False
    codex_calls_per_day: int = 12
    codex_model: str = ""
    credentials: dict = field(default_factory=dict, repr=False)

    def token_for(self, profile):
        ref = profile.get("credential_ref", "local-x")
        if ref in self.credentials:
            return self.credentials[ref]
        if ref == "local-x":
            return self.token
        raise ValueError("credential_reference_unresolved")

    @classmethod
    def private(cls):
        load_private_env()
        data = Path(os.environ.get("XBOT_DATA", str(ROOT / "data"))).resolve()
        data.mkdir(parents=True, exist_ok=True)
        auth = data / ".operator-key"
        key = os.environ.get("XBOT_OPERATOR_KEY", "")
        if not key:
            if not auth.exists():
                auth.write_text(secrets.token_urlsafe(32), encoding="utf-8")
            key = auth.read_text(encoding="utf-8").strip()
        model = os.environ.get("XBOT_CODEX_MODEL", "")
        # An app display alias is not a CLI model ID. Use CLI's maintained default
        # unless the operator explicitly sets this module's model. No silent retry fallback.
        if not isinstance(model, str) or len(model) > 100:
            raise ValueError("invalid_codex_model_preference")
        credential_file = os.environ.get("XBOT_CREDENTIALS_FILE", "")
        credentials = {}
        if credential_file:
            import json

            credentials = json.loads(Path(credential_file).read_text(encoding="utf-8"))
            if not isinstance(credentials, dict) or any(
                not isinstance(k, str) or not isinstance(v, str) or not v for k, v in credentials.items()
            ):
                raise ValueError("invalid_private_credential_map")
        return cls(
            data=data,
            token=os.environ.get("TREG_TOKEN", ""),
            operator_key=key,
            codex_enabled=os.environ.get("XBOT_CODEX_ENABLED", "false").lower() == "true",
            codex_model=model,
            codex_calls_per_day=int(os.environ.get("XBOT_CODEX_CALLS_PER_DAY", "12")),
            credentials=credentials,
        )
