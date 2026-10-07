import os
import secrets
import tomllib
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
    core_url: str = ""
    core_worker_key: str = field(default="", repr=False)

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
        if not model:
            # Read only the scalar preference; do not pass config, MCP bindings or keys to the no-tools runner.
            pref = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "config.toml"
            if pref.exists():
                model = tomllib.loads(pref.read_text(encoding="utf-8")).get("model", "")
        if not isinstance(model, str) or len(model) > 100:
            raise ValueError("invalid_codex_model_preference")
        return cls(data=data, token=os.environ.get("TREG_TOKEN", ""), operator_key=key,
                   codex_enabled=os.environ.get("XBOT_CODEX_ENABLED", "false").lower() == "true",
                   codex_model=model,
                   core_url=os.environ.get("XBOT_CORE_URL", ""),
                   core_worker_key=os.environ.get("XBOT_CORE_WORKER_KEY", ""))
