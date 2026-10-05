"""Local generic draft renderer. Input has site ID; no SMTP or fiscal adapter."""
import argparse
import json
from pathlib import Path

from pinet_core.invoicing import Draft, render


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--issuer-profile", type=Path)
    args = parser.parse_args()
    request = json.loads(args.input.read_text(encoding="utf-8"))
    if args.issuer_profile:
        profile = json.loads(args.issuer_profile.read_text(encoding="utf-8"))
        for key in ["issuer", "tax_treatment", "vat_rate_percent", "tax_policy_ref"]:
            request[key] = profile[key]
    value = Draft.model_validate(request)
    snapshot, html = render(value)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "invoice-draft.json").write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.output / "invoice-draft.html").write_text(html, encoding="utf-8")
    print(json.dumps({"site_id": value.site_id, "issued": False, "sent": False,
                      "missing": snapshot["missing"], "output": str(args.output.resolve())}))


if __name__ == "__main__":
    main()
