"""Regenerate from the maintained strict wire; no API/DB/provider imports."""
import json
from pathlib import Path

from pinet_core.workspace_team.workflow_contract import document

if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-workspace-agent-workflow.openapi.json"
    target.write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
    print("Canonical workspace agent workflow contract written")
