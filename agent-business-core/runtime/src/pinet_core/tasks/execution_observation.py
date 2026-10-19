"""Opt-in private CLI diagnostics, never an API receipt or a second executor."""
import hashlib
import json
import stat
from time import monotonic


class Observation:
    def __init__(self, file, stderr_file, prompt, args, seconds):
        self.file, self.stderr_file, self.started = file, stderr_file, monotonic()
        self.value = {"version": "cli-execution-observation.v2", "stage": "starting",
            "prompt_bytes": len(prompt.encode()), "argv_sha256": hashlib.sha256(
                json.dumps([str(arg) for arg in args], ensure_ascii=False).encode()).hexdigest(), "timeout_seconds": seconds,
            "stdout_bytes": 0, "stderr_bytes": 0, "stdout_first_seconds": None,
            "stdout_last_seconds": None, "stderr_first_seconds": None, "stderr_last_seconds": None,
            "stderr_truncated": False, "exit_code": None, "outcome": None, "cleanup_completed": False,
            "diagnostic_write_errors": 0, "diagnostic_read_errors": 0,
            "process_start_error_class": None, "process_start_errno": None, "process_start_winerror": None,
            "stdin_closed_seconds": None, "stdout_eof_seconds": None, "stderr_eof_seconds": None,
            "process_wait_done_seconds": None, "process_returncode_observed": None,
            "cleanup_started_seconds": None, "parent_returncode_before_cleanup": None,
            "wait_done_before_cleanup": None, "stdout_done_before_cleanup": None,
            "stderr_done_before_cleanup": None, "feed_done_before_cleanup": None,
            "stdout_eof_before_cleanup": None, "stderr_eof_before_cleanup": None,
            "output_exists_before_cleanup": None, "output_is_file_before_cleanup": None,
            "output_bytes_before_cleanup": None, "cleanup_kill_requested": False}
        if stderr_file:
            try:
                stderr_file.touch(exist_ok=False)
            except OSError:
                self.value["diagnostic_write_errors"] += 1
                self.stderr_file = None
        self.save()

    def save(self, **values):
        self.value.update(values, elapsed_seconds=round(monotonic() - self.started, 6))
        if self.file:
            try:
                temporary = self.file.with_suffix(self.file.suffix + ".tmp")
                temporary.write_text(json.dumps(self.value, sort_keys=True), encoding="utf-8")
                temporary.replace(self.file)
            except OSError:
                self.value["diagnostic_write_errors"] += 1

    def chunk(self, stream, chunk, cap):
        previous = self.value[stream + "_bytes"]
        self.value[stream + "_bytes"] += len(chunk)
        now = round(monotonic() - self.started, 6)
        if self.value[stream + "_first_seconds"] is None:
            self.value[stream + "_first_seconds"] = now
        self.value[stream + "_last_seconds"] = now
        if stream == "stderr":
            retained = chunk[:max(0, cap - previous)]
            self.value["stderr_truncated"] = previous + len(chunk) > cap
            if self.stderr_file and retained:
                try:
                    with self.stderr_file.open("ab") as private_file:
                        private_file.write(retained)
                except OSError:
                    self.value["diagnostic_write_errors"] += 1
        self.save(stage="draining")

    def mark(self, field, **values):
        self.save(**{field: round(monotonic() - self.started, 6)}, **values)

    def before_cleanup(self, process, output, *, waited, stdout, stderr, feeding):
        # Capture observed state before stop/cancellation changes any task or code.
        values = {"cleanup_started_seconds": round(monotonic() - self.started, 6),
            "parent_returncode_before_cleanup": process.returncode if process else None,
            "wait_done_before_cleanup": waited.done() if waited else None,
            "stdout_done_before_cleanup": stdout.done() if stdout else None,
            "stderr_done_before_cleanup": stderr.done() if stderr else None,
            "feed_done_before_cleanup": feeding.done() if feeding else None,
            "stdout_eof_before_cleanup": self.value["stdout_eof_seconds"] is not None,
            "stderr_eof_before_cleanup": self.value["stderr_eof_seconds"] is not None,
            "cleanup_kill_requested": process is not None and process.returncode is None}
        try:
            info = output.stat()
        except FileNotFoundError:
            values.update(output_exists_before_cleanup=False, output_is_file_before_cleanup=False,
                          output_bytes_before_cleanup=None)
        except OSError:
            self.value["diagnostic_read_errors"] += 1
            values.update(output_exists_before_cleanup=None, output_is_file_before_cleanup=None,
                          output_bytes_before_cleanup=None)
        else:
            regular = stat.S_ISREG(info.st_mode)
            values.update(output_exists_before_cleanup=True, output_is_file_before_cleanup=regular,
                          output_bytes_before_cleanup=info.st_size if regular else None)
        self.save(**values)
