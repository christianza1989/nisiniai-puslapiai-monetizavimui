"""Shared bounded owned CLI process transport; adapters choose fixed schemas and allowed trace items."""
import asyncio
import json
import os
import subprocess

from .execution_observation import Observation


class RunnerError(Exception):
    def __init__(self, code, receipt=None):
        self.code = code
        self.receipt = receipt or {}


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
                  stdout_limit=131072, output_limit=32768, on_event=None, trace_file=None, partial_receipt=None,
                  stderr_file=None, observation_file=None):
    observed_stdout = []
    observation = None

    def observed_receipt():
        if receipt is not None:
            return receipt
        # EOF may never arrive even after a terminal usage event was already received.
        # Parse complete bounded lines only; absent/invalid evidence remains unknown.
        raw = b"".join(observed_stdout)
        prefix = raw.rsplit(b"\n", 1)
        parsed = None
        if len(prefix) == 2:
            try:
                parsed = parse_trace(prefix[0].decode("utf-8", errors="replace"))
            except RunnerError as error:
                parsed = error.receipt or None
            except ValueError:
                pass
        if partial_receipt is not None and raw:
            # Opt-in pipeline evidence only; unrelated callers keep their exact receipt.
            snapshot = partial_receipt(raw)
            if snapshot:
                return {**(parsed or {}), **snapshot}
        return parsed

    async def bounded(stream, cap, inspect=False):
        chunks, size, pending = [], 0, b""
        while chunk := await stream.read(8192):
            if observation:
                observation.chunk("stdout" if inspect else "stderr", chunk, cap)
            size += len(chunk)
            if size > cap:
                raise RunnerError("output_invalid")
            chunks.append(chunk)
            if inspect:
                observed_stdout.append(chunk)
            if inspect and trace_file:
                with trace_file.open("ab") as private_trace:
                    private_trace.write(chunk)
            if inspect and on_event:
                pending += chunk
                while b"\n" in pending:
                    line, pending = pending.split(b"\n", 1)
                    if line.strip():
                        on_event(json.loads(line))
        if observation:
            observation.mark("stdout_eof_seconds" if inspect else "stderr_eof_seconds")
        if inspect and on_event and pending.strip():
            on_event(json.loads(pending))
        return b"".join(chunks).decode("utf-8", errors="replace")

    process, tasks, receipt = None, [], None
    stdout = stderr = waited = feeding = None
    try:
        if stderr_file or observation_file:
            # Adapters supply fixed paths in their exclusive owned private run folder.
            if any(file and file.resolve().parent != cwd.resolve() for file in (stderr_file, observation_file)):
                raise RunnerError("output_invalid")
            observation = Observation(observation_file, stderr_file, prompt, args, seconds)
        async with asyncio.timeout(seconds):
            process = await asyncio.create_subprocess_exec(*args, stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=env, cwd=cwd,
                **({"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}))
            if observation:
                observation.save(stage="spawned", process_id=process.pid)

            async def feed():
                process.stdin.write(prompt.encode())
                await process.stdin.drain()
                process.stdin.close()
                if observation:
                    observation.mark("stdin_closed_seconds", stage="stdin_closed")

            async def wait_for_process():
                result = await process.wait()
                if observation:
                    observation.mark("process_wait_done_seconds", process_returncode_observed=result)
                return result

            async def supervise():
                while process.returncode is None:
                    if not await still_authorized():
                        raise RunnerError("authorization_revoked")
                    await asyncio.sleep(1)

            stdout = asyncio.create_task(bounded(process.stdout, stdout_limit, True))
            stderr = asyncio.create_task(bounded(process.stderr, 65536))
            watcher = asyncio.create_task(supervise())
            waited, feeding = asyncio.create_task(wait_for_process()), asyncio.create_task(feed())
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
            if observation:
                observation.save(stage="trace_parsed", exit_code=process.returncode)
            if process.returncode:
                raise RunnerError("provider_error")
            if not output.is_file() or output.stat().st_size > output_limit:
                raise RunnerError("output_invalid")
            result = json.loads(output.read_text(encoding="utf-8"))
            if observation:
                observation.save(stage="output_checked", outcome="succeeded", output_bytes=output.stat().st_size)
            return result, receipt
    except RunnerError as error:
        error.receipt = observed_receipt() or error.receipt
        if observation:
            observation.value["outcome"] = error.code
        raise
    except asyncio.CancelledError:
        if observation:
            observation.value["outcome"] = "cancelled"
        raise
    except TimeoutError:
        if observation:
            observation.value["outcome"] = "run_timeout"
        raise RunnerError("run_timeout", observed_receipt()) from None
    except (OSError, ValueError):
        if observation:
            observation.value["outcome"] = "output_invalid"
        raise RunnerError("output_invalid", observed_receipt()) from None
    finally:
        if observation:
            observation.before_cleanup(process, output, waited=waited, stdout=stdout, stderr=stderr, feeding=feeding)
        if process:
            await stop_process(process)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        if observation:
            try:
                observation.save(last_execution_stage=observation.value["stage"], stage="closed",
                                 exit_code=process.returncode if process else None,
                                 cleanup_completed=True)
            except OSError:
                # A diagnostic write failure must never replace the actual execution error.
                pass
