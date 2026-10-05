"""Creates private local credentials once. Never prints secrets."""
import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
target = root / ".env"
if target.exists():
    existing = target.read_text(encoding="utf-8")
    if not any(line.startswith("PINET_OPERATOR_SECRET=") for line in existing.splitlines()):
        with target.open("a", encoding="utf-8") as handle:
            handle.write("\nPINET_OPERATOR_SECRET=" + secrets.token_hex(32) + "\n")
        print("Added a private operator credential; existing settings preserved.")
    else:
        print("Private .env already exists; preserved.")
    additions = {"PINET_KNOWLEDGE_REFRESH_ENABLED": "true", "PINET_KNOWLEDGE_SOURCE_BASE_URL": "http://127.0.0.1:5187"}
    with target.open("a", encoding="utf-8") as handle:
        for key, value in additions.items():
            if not any(line.startswith(key + "=") for line in existing.splitlines()):
                handle.write(f"\n{key}={value}\n")
else:
    admin, runtime = secrets.token_hex(24), secrets.token_hex(24)
    lines = {
        "PINET_DB_ADMIN_PASSWORD": admin,
        "PINET_DB_RUNTIME_PASSWORD": runtime,
        "PINET_ADMIN_DATABASE_URL": f"postgresql+asyncpg://pinet_admin:{admin}@127.0.0.1:15432/pinet",
        "PINET_DATABASE_URL": f"postgresql+asyncpg://pinet_runtime:{runtime}@127.0.0.1:15432/pinet",
        "PINET_EDGE_SECRET": secrets.token_hex(32),
        "PINET_WORKER_SECRET": secrets.token_hex(32),
        "PINET_OPERATOR_SECRET": secrets.token_hex(32),
        "PINET_ENVIRONMENT": "local",
        "PINET_ALLOW_SIMULATION": "true",
        "PINET_VOICE_ENABLED": "false",
        "PINET_M0_VERIFIED": "false",
        "PINET_SMTP_ENABLED": "false",
        "PINET_KNOWLEDGE_REFRESH_ENABLED": "true",
        "PINET_KNOWLEDGE_SOURCE_BASE_URL": "http://127.0.0.1:5187",
    }
    target.write_text("\n".join(f"{k}={v}" for k, v in lines.items()) + "\n", encoding="utf-8")
    print("Created private local credentials. Voice and SMTP remain disabled.")
