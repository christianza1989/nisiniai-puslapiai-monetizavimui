"""Initial High private-draft role projection; full source snapshot stays authoritative."""
import hashlib
import json

FILES = (
    "SKILLS/niche-site-builder/SKILL.md",
    "SKILLS/niche-site-builder/references/business-validation.md",
    "SKILLS/niche-site-builder/references/typography-system.md",
    "SKILLS/niche-business-tools/SKILL.md",
    "SKILLS/niche-content-planner/references/planning-decisions.md",
    "SKILLS/niche-content-planner/references/quality-review.md",
    "SKILLS/niche-content-planner/references/studio-contract.md",
    "SKILLS/niche-content-planner/references/media-workflow.md",
    "SKILLS/niche-content-planner/references/language-quality.md",
    "SKILLS/niche-seo-geo-core/references/evidence-contract.md",
)
PROFILE = "high-private-draft.v1"
DIRECTIVE = """Your role in this turn is to convert the supplied decisions into the exact private draft schema.
If approved_business_plan is present, reuse its exact reviewed business choice, assumptions, evidence limits,
alternatives and site intent. It is a planning receipt, not verified business facts or completed site work.
Do not repeat the ten-area discovery investigation or reproduce that report inside every page. Produce useful
concise business fields, complete distinct page copy and the initial GUIDE briefs required by this schema.
For a complete local website, use the existing page system within its eight-page bound: home '/',
guide hub '/gidai/', contact '/kontaktai/', privacy '/privatumas/', and a truthful editorial/profile page
such as '/redakcija/', plus the distinct offer/support pages the business needs. Initial GUIDE paths
must be real descendants of their guide hub. Unknown people, expertise, contacts and service capacity
must not be invented. Draft text and a form intention are not an operating inquiry-delivery receipt.
Deep editorial review, writing individual guides, media import, release, rendering and actual F1 verification
are separate maintained stages. Do not execute or claim them in this no-file role. Preserve all remaining
gates and unknowns. The full canonical instruction snapshot is retained by the server; below are complete
references applicable to this private proposition/page-draft phase. Independent reviews remain required.
"""


def project(material, full_hash, files, *, footer=""):
    """Select complete already-loaded sections; do not summarize or reread mutable files."""
    positions = []
    if not files:
        raise ValueError("loaded_sources_required")
    if footer:
        if not material.endswith(footer):
            raise ValueError("exact_policy_footer_required")
        material = material[:-len(footer)]
    cursor = 0
    for file in files:
        marker = "\n\n" + file + "\n"
        position = material.index(marker, cursor)
        positions.append(position)
        cursor = position + len(marker)
    sections = {file: material[start:end] for file, start, end in
                zip(files, positions, [*positions[1:], len(material)], strict=True)}
    # A paused profile can omit the language reference in the full snapshot already.
    missing = set(FILES) - set(sections)
    if missing and not (footer and missing == {"SKILLS/niche-content-planner/references/language-quality.md"}):
        raise ValueError("complete_applicable_references_required")
    selected = [sections[file] for file in FILES if file in sections]
    value = material[:positions[0]] + "\n\n" + DIRECTIVE + "".join(selected) + footer
    pin = hashlib.sha256(json.dumps({"full_instruction_snapshot_sha256": full_hash,
        "prompt_profile": PROFILE, "provider_policy_sha256": hashlib.sha256(value.encode()).hexdigest()},
        sort_keys=True).encode()).hexdigest()
    return value, pin
