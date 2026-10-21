"""Explicit finite adapter for the independently proven 7200/1800 budget.

The accepted watcher remains unchanged. Its worker path selects this adapter;
prepare_closed.py retains its conservative 1800-second CLI defaults.
"""
import sys


def accepted_arguments(arguments):
    forbidden={'--compiler-timeout-seconds','--runtime-timeout-seconds','--watch-seconds'}
    if any(argument.split('=',1)[0] in forbidden for argument in arguments):
        raise ValueError('ACCEPTED_FINITE_BUDGET_MUST_NOT_BE_OVERRIDDEN')
    return [*arguments,'--compiler-timeout-seconds','7200','--runtime-timeout-seconds','1800']


def main():
    sys.argv[1:]=accepted_arguments(sys.argv[1:])
    from prepare_closed import main as finite_main
    finite_main()


if __name__=='__main__':main()
