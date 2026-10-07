"""Private UI QA without provider credentials or paid actions: uv run python tests/preview.py."""
import sys
from pathlib import Path

import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from xbot.cli import seed  # noqa: E402
from xbot.config import ROOT, Config  # noqa: E402
from xbot.server import create_app  # noqa: E402
from xbot.store import Store  # noqa: E402

config = Config(data=ROOT / "data/qa-ui", operator_key="qa-only-operator-key-20261007-not-live")
store = Store(config.data / "state.sqlite")
seed(store, config)
uvicorn.run(create_app(config, store), host="127.0.0.1", port=8894, access_log=False)
