"""Shared bounded owned CLI process transport; adapters choose fixed schemas and allowed trace items."""
import asyncio
import json
import os
import subprocess


class RunnerError(Exception):
    def __init__(self, code):
        self.code = code


async def stop_process(process):
    if process.returncode is not None:
        return
    if os.name == "nt":
        await asyncio.to_thread(subprocess.run, ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                                capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
    else:
        process.kill()
    await process.wait()


async def execute(args, *, prompt, cwd, env, output, seconds, still_authorized, parse_trace,
                  stdout_limit=131072, output_limit=32768, on_event=None, trace_file=None):
    async def bounded(stream, cap, inspect=False):
        chunks, size, pending = [], 0, b""
        while chunk := await stream.read(8192):
            size += len(chunk)
            if size > cap:
                raise RunnerError("output_invalid")
            chunks.append(chunk)
            if inspect and trace_file:
                with trace_file.open("ab") as private_trace:
                    private_trace.write(chunk)
            if inspect and on_event:
                pending += chunk
                while b"\n" in pending:
                    line, pending = pending.split(b"\n", 1)
                    if line.strip():
                        on_event(json.loads(line))
        if inspect and on_event and pending.strip():
            on_event(json.loads(pending))
        return b"".join(chunks).decode("utf-8", errors="replace")

    process, tasks = None, []
    try:
        async with asyncio.timeout(seconds):
            process = await asyncio.create_subprocess_exec(*args, stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=env, cwd=cwd,
                **({"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}))

            async def feed():
                process.stdin.write(prompt.encode())
                await process.stdin.drain()
                process.stdin.close()

            async def supervise():
                while process.returncode is None:
                    if not await still_authorized():
                        raise RunnerError("authorization_revoked")
                    await asyncio.sleep(1)

            stdout = asyncio.create_task(bounded(process.stdout, stdout_limit, True))
            stderr = asyncio.create_task(bounded(process.stderr, 65536))
            watcher = asyncio.create_task(supervise())
            waited, feeding = asyncio.create_task(process.wait()), asyncio.create_task(feed())
            tasks = [stdout, stderr, watcher, waited, feeding]
            pending = set(tasks)
            while any(not task.done() for task in (waited, stdout, stderr, feeding)):
                done, _ = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
                for task in done:
                    pending.discard(task)
                    task.result()
            watcher.cancel()
            await asyncio.gather(watcher, return_exceptions=True)
            receipt = parse_trace(stdout.result())
            if process.returncode:
                raise RunnerError("provider_error")
            if not output.is_file() or output.stat().st_size > output_limit:
                raise RunnerError("output_invalid")
            return json.loads(output.read_text(encoding="utf-8")), receipt
    except TimeoutError:
        raise RunnerError("run_timeout") from None
    except (OSError, ValueError):
        raise RunnerError("output_invalid") from None
    finally:
        if process:
            await stop_process(process)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
