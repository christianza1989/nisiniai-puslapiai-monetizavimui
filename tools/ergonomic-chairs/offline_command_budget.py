"""Finite execution budgets are separate from model correctness criteria."""
import json
import subprocess
import time

DEFAULT_SECONDS = 1800
MAX_SECONDS = 7200


def command_budget(value):
    seconds = int(value)
    if seconds < DEFAULT_SECONDS or seconds > MAX_SECONDS:
        raise ValueError('OFFLINE_COMMAND_BUDGET_OUT_OF_RANGE')
    return seconds


def selected_closed_jobs(completed, requested, known_jobs):
    if not requested:
        return list(completed)
    wanted = set(requested)
    if len(wanted) != len(requested):
        raise ValueError('DUPLICATE_OFFLINE_JOB')
    if not wanted.issubset(known_jobs) or not wanted.issubset(completed):
        raise ValueError('OFFLINE_JOB_NOT_CLOSED')
    return [job for job in completed if job in wanted]


def run_checked_command(arguments, *, cwd, stream, seconds, stage,
                        runner=subprocess.run, clock=time.monotonic):
    """The child must really finish; timeout/exit failure never becomes PASS."""
    seconds = command_budget(seconds)
    started = clock()
    def event(phase, **details):
        stream.write((json.dumps(dict(phase=phase, stage=stage,
            budgetSeconds=seconds, elapsedSeconds=clock()-started, **details))+'\n').encode())
        stream.flush()
    event('OFFLINE_COMMAND_STARTED')
    try:
        result = runner(arguments, cwd=cwd, stdout=stream, stderr=subprocess.STDOUT,
                        check=True, timeout=seconds)
    except subprocess.TimeoutExpired:
        event('OFFLINE_COMMAND_TIMEOUT')
        raise
    except subprocess.CalledProcessError as error:
        event('OFFLINE_COMMAND_FAILED', exitCode=error.returncode)
        raise
    event('OFFLINE_COMMAND_RETURNED', exitCode=result.returncode)
    return result
