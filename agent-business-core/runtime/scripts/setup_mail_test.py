"""Reuse explicitly named existing Hostinger configuration without printing secrets."""
import argparse
from pathlib import Path

from dotenv import dotenv_values, set_key


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--recipient", required=True)
    args = parser.parse_args()
    from pydantic import EmailStr, TypeAdapter
    recipient = str(TypeAdapter(EmailStr).validate_python(args.recipient))
    source = dotenv_values(args.source)
    user, password = source.get("LEAD_SMTP_USER"), source.get("LEAD_SMTP_PASSWORD")
    if not user or user.casefold() != "info@pinet.lt" or not password:
        raise RuntimeError("named_pinet_smtp_configuration_missing")
    # Writes only this runtime's ignored configuration. Public source remains read-only.
    for key, value in {"PINET_SMTP_USER": user, "PINET_SMTP_PASSWORD": password,
        "PINET_SMTP_HOST": "smtp.hostinger.com", "PINET_SMTP_PORT": "465",
        "PINET_SENDER_EMAIL": "info@pinet.lt", "PINET_LAB_MAIL_ENABLED": "true",
        "PINET_LAB_MAIL_RECIPIENT": recipient}.items():
        set_key(".env", key, value, quote_mode="always")
    print("Named existing Hostinger credentials connected to owner-only test mail. Production SMTP flag unchanged.")


if __name__ == "__main__":
    main()
