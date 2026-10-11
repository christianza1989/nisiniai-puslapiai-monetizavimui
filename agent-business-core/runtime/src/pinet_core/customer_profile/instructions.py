"""Fixed packaged role text. No niche defaults, adaptive release or caller prompt."""
import hashlib
from pathlib import Path

VERSION = "customer-profile.v1"
NEED_FIELDS = ("goal", "requirements", "deadline", "budget", "location")
ROOT = Path(__file__).resolve().parents[1] / "instructions" / "customer-profile"
HASHES = {
    "conversation": "281458c344c1a93aa1529e577aa003cefdeebf98db70668687e4950aa56e3beb",
    "quality": "4c5e28ca54f2606f01f8c9eb10dec40e2c94abb1b4e831f0b09b15c3d7d87856",
}


def compose(role):
    if role not in HASHES:
        raise ValueError("unsupported_customer_profile_role")
    path = ROOT / (role + ".md")
    if path.is_symlink() or path.resolve().parent != ROOT.resolve():
        raise ValueError("invalid_customer_profile_instructions")
    # Hash the exact text delivered to a future consumer, normalizing checkout line endings.
    value = path.read_text(encoding="utf-8")
    if not 1 <= len(value.encode()) <= 16000 or hashlib.sha256(value.encode()).hexdigest() != HASHES[role]:
        raise ValueError("invalid_customer_profile_instructions")
    return {"role": role, "text": value, "sha256": HASHES[role], "profile_version": VERSION}


def manifest():
    return {"profile_version": VERSION, "conversation_sha256": compose("conversation")["sha256"],
        "quality_sha256": compose("quality")["sha256"]}
