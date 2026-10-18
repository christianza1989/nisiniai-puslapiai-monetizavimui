"""Compatibility entry point for the common display task CLI.

Use enqueue/read/run-one and an explicit display policy. The previous direct
one-mail model path is retired; historical sidecars/attempt claims stay intact.
"""
import asyncio

from mail_display_task import main

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        raise SystemExit("Display task unavailable; use an explicit policy and inspect retained task evidence. No direct model retry.") from None
