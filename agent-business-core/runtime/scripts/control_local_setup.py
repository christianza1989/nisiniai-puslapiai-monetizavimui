"""Create an isolated local pilot configuration without touching an existing runtime."""
import argparse
import json
import secrets
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--public-core", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    public = Path(args.public_core).resolve()
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=public, text=True).strip()
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=public, text=True).strip():
        raise SystemExit("Public evidence must be a clean, freshly verified checkout.")
    source = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    # Validate all source data before writing any private configuration.
    packages = json.loads((public / "lib/generated/content-packages.json").read_text(encoding="utf-8"))
    entries = [{"site_id": p["site"]["id"], "canonical_host": p["site"]["canonicalHost"],
                "display_name": p["site"]["name"], "evidence_revision": revision} for p in packages]
    target = root / "artifacts" / "control-local"
    target.mkdir(parents=True, exist_ok=True)
    if (root / ".env").exists() or any(target.iterdir()):
        raise SystemExit("Existing configuration preserved. Use the existing private files; no overwrite.")
    admin, runtime = secrets.token_hex(24), secrets.token_hex(24)
    values = {
        "PINET_DB_ADMIN_PASSWORD": admin, "PINET_DB_RUNTIME_PASSWORD": runtime,
        "PINET_ADMIN_DATABASE_URL": f"postgresql+asyncpg://pinet_admin:{admin}@127.0.0.1:15438/pinet",
        "PINET_DATABASE_URL": f"postgresql+asyncpg://pinet_runtime:{runtime}@127.0.0.1:15438/pinet",
        "PINET_EDGE_SECRET": secrets.token_hex(32), "PINET_WORKER_SECRET": secrets.token_hex(32),
        "PINET_OPERATOR_SECRET": secrets.token_hex(32), "PINET_ENVIRONMENT": "local",
        "PINET_CONTROL_ENABLED": "true", "PINET_CONTROL_CURSOR_SECRET": secrets.token_hex(32),
        "PINET_CONTROL_SOURCE_REVISION": source, "PINET_CONTROL_SESSION_SECONDS": "28800",
        "PINET_VOICE_ENABLED": "false", "PINET_SMTP_ENABLED": "false", "PINET_LAB_MAIL_ENABLED": "false",
        "PINET_KNOWLEDGE_REFRESH_ENABLED": "false", "PINET_LEARNING_ENABLED": "false",
        "PINET_ALLOW_SIMULATION": "true", "PINET_CORE_URL": "http://127.0.0.1:8846",
    }
    (root / ".env").write_text("\n".join(f"{k}={v}" for k, v in values.items()) + "\n", encoding="utf-8")
    (target / "compose.private.yaml").write_text('''services:
  postgres:
    image: postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24
    container_name: pinet-portfolio-i1-20261010
    environment:
      POSTGRES_DB: pinet
      POSTGRES_USER: pinet_admin
      POSTGRES_PASSWORD: ${PINET_DB_ADMIN_PASSWORD:?private env required}
    ports: ["127.0.0.1:15438:5432"]
    volumes: ["portfolio_i1_pg:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pinet_admin -d pinet"]
      interval: 3s
      timeout: 3s
      retries: 20
volumes:
  portfolio_i1_pg:
''', encoding="utf-8")
    credentials = {"username": "pinet-owner-local", "password": secrets.token_urlsafe(32)}
    (target / "credentials.private.json").write_text(json.dumps(credentials), encoding="utf-8")
    # Exact source inventory only. No DNS/ownership/actual runtime inference.
    manifest = {"organization_key": "pinet-source-local", "organization_name": "MB Pinet",
                "portfolio_name": "Pinet svetainių registras", "entries": entries,
                "credential_file": "credentials.private.json"}
    (target / "operator-manifest.private.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2),
                                                         encoding="utf-8")
    print("Private isolated pilot configuration created; no secrets printed. Ports15438/8846, channels OFF.")


if __name__ == "__main__":
    main()
