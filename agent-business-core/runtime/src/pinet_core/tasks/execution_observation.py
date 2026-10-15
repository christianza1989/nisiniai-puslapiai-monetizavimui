"""Opt-in private CLI diagnostics, never an API receipt or a second executor."""
import hashlib
import json
from time import monotonic


class Observation:
    def __init__(self, file, stderr_file, prompt, args, seconds):
        self.file, self.stderr_file, self.started = file, stderr_file, monotonic()
        self.value = {"version": "cli-execution-observation.v1", "stage": "starting",
            "prompt_bytes": len(prompt.encode()), "argv_sha256": hashlib.sha256(
                json.dumps([str(arg) for arg in args], ensure_ascii=False).encode()).hexdigest(), "timeout_seconds": seconds,
            "stdout_bytes": 0, "stderr_bytes": 0, "stdout_first_seconds": None,
            "stdout_last_seconds": None, "stderr_first_seconds": None, "stderr_last_seconds": None,
            "stderr_truncated": False, "exit_code": None, "outcome": None, "cleanup_completed": False,
            "diagnostic_write_errors": 0}
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
