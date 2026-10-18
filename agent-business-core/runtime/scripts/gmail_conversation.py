"""Explicit reviewed reply; reuse the maintained campaign private IO and receipts."""
import asyncio

from gmail_campaign import main

from pinet_core.control.routes import ControlError
from pinet_core.mail_provider.conversation import ConversationGmail
from pinet_core.mail_provider.gmail import GmailError

if __name__ == "__main__":
    try:
        asyncio.run(main(gateway_type=ConversationGmail))
    except (ControlError, GmailError) as error:
        raise SystemExit("Gmail requested reply unavailable: " + error.code) from None
    except Exception:
        raise SystemExit("Gmail requested reply failed; inspect retained private receipt. No automatic retry.") from None
