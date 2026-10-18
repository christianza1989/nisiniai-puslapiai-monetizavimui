"""One bounded loopback callback, without browser cookies, logs or reflected codes."""
import asyncio
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from .gmail import GmailError


def callback_target(raw, port):
    try:
        lines = raw.decode("ascii").split("\r\n")
        method, target, version = lines[0].split(" ")
        headers = {}
        for line in lines[1:]:
            if not line:
                break
            name, value = line.split(":", 1)
            name = name.casefold()
            if name in headers:
                raise ValueError("duplicate_header")
            headers[name] = value.strip()
        parsed = urlsplit(target)
        if (method != "GET" or version not in {"HTTP/1.0", "HTTP/1.1"}
                or not target.startswith("/") or parsed.scheme or parsed.netloc or parsed.fragment
                or parsed.path != "/oauth/callback" or len(target) > 6144
                or headers.get("host") != f"127.0.0.1:{port}"
                or "transfer-encoding" in headers or headers.get("content-length", "0") != "0"):
            raise ValueError("exact_callback_required")
        return f"http://127.0.0.1:{port}" + target
    except (UnicodeError, ValueError, TypeError):
        raise GmailError("gmail_callback_invalid") from None


@asynccontextmanager
async def listener(complete):
    """Bind before creating the OAuth flow; invalid requests consume no grant."""
    result, lock = asyncio.get_running_loop().create_future(), asyncio.Lock()
    active = set()
    port = None

    async def handle(reader, writer):
        active.add(asyncio.current_task())
        status, body = "400 Bad Request", "Prisijungimas nepatvirtintas. Grįžkite į Verslomatiką."
        try:
            raw = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 10)
            target = callback_target(raw, port)
            async with lock:
                if result.done():
                    raise GmailError("gmail_callback_already_consumed")
                try:
                    value = await complete(target)
                except GmailError as error:
                    # Wrong state/origin can be an unrelated local request. The
                    # genuine callback may still arrive; exchange failures stop.
                    if error.code not in {"gmail_oauth_state_invalid", "gmail_callback_invalid"}:
                        result.set_exception(error)
                    raise
                except Exception:
                    result.set_exception(GmailError("gmail_callback_completion_failed"))
                    raise GmailError("gmail_callback_completion_failed") from None
                else:
                    result.set_result(value)
                    status, body = "200 OK", "Gmail prijungtas. Galite grįžti į Verslomatiką."
        except (GmailError, TimeoutError, asyncio.IncompleteReadError, asyncio.LimitOverrunError):
            pass
        finally:
            encoded = body.encode("utf-8")
            try:
                writer.write((f"HTTP/1.1 {status}\r\nContent-Type: text/plain; charset=utf-8\r\n"
                    f"Content-Length: {len(encoded)}\r\nCache-Control: no-store\r\n"
                    "Referrer-Policy: no-referrer\r\nConnection: close\r\n\r\n").encode() + encoded)
                await writer.drain()
            except (ConnectionError, OSError):
                pass
            writer.close()
            active.discard(asyncio.current_task())

    server = await asyncio.start_server(handle, "127.0.0.1", 0, limit=8192)
    port = server.sockets[0].getsockname()[1]
    try:
        yield f"http://127.0.0.1:{port}/oauth/callback", result
    finally:
        server.close()
        await server.wait_closed()
        for task in tuple(active):
            task.cancel()
        if active:
            await asyncio.gather(*tuple(active), return_exceptions=True)
        if not result.done():
            result.cancel()
