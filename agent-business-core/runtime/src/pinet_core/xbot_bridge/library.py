"""Resolve the maintained sibling package explicitly; never silently substitute old code."""

import importlib
import sys
from pathlib import Path


def load():
    root = Path(__file__).resolve().parents[4] / "xbot"
    if root.is_symlink() or not (root / "xbot/module.py").is_file():
        raise RuntimeError("maintained_xbot_source_unavailable")
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    result = importlib.import_module("xbot.module")
    if Path(result.__file__).resolve() != (root / "xbot/module.py").resolve():
        raise RuntimeError("foreign_xbot_package")
    return result
