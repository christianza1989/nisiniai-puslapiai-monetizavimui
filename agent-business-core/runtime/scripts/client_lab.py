"""Six natural client dialogues; synthetic authority stays outside assistant input.

Explicit local Codex text baseline, NOT a Gemini or audio certification.
Captures .eml locally; never invokes SMTP, suppliers or commercial writes.
"""
import argparse
import asyncio
import json
import time
from email.message import EmailMessage
from html import escape
from pathlib import Path
from uuid import uuid4

import httpx
from sqlalchemy import delete, select

from pinet_core import customer_language, jobs, knowledge, profiles, service
from pinet_core.api import app
from pinet_core.codex_lab import CodexLab
from pinet_core.config import settings
from pinet_core.contracts import Analysis, Knowledge, NeedPatch, Quality
from pinet_core.db import db
from pinet_core.evidence_output import bound_schema
from pinet_core.models import (
    Admission,
    Artifact,
    BusinessPolicy,
    Case,
    CostReservation,
    KnowledgeState,
    PolicyRevision,
)
from pinet_core.offers import OfferSnapshot, PricingPolicy, email_html, retail_options
from pinet_core.security import digest, edge_signature
from pinet_core.text_tools import core_arguments, turn_schema

ROOT = Path(__file__).resolve().parents[1]


async def signed(client, session, action, body, site_id):
    path = f"/v1/sites/{site_id}/sessions/{session['conversation_id']}/{action}"
    content = json.dumps(body).encode()
    stamp, nonce = str(int(time.time())), str(uuid4())
    response = await client.post(path, content=content, headers={"x-pinet-session": session["session_token"],
        "Content-Type": "application/json", "x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
        "x-pinet-signature": edge_signature(settings().edge_secret, stamp, nonce, "POST", path, content)})
    response.raise_for_status()
    return response.json()


def email_capture(directory, identity, payload, recipient):
    message = EmailMessage()
    message["From"] = "MB Pinet <info@pinet.lt>"
    message["To"] = recipient
    message["Subject"] = payload["subject"]
    message["X-Pinet-Synthetic"] = "true"
    message.set_content(payload["body"])
    message.add_alternative(email_html(payload["body"], settings().sender_name), subtype="html")
    (directory / f"{identity}.eml").write_bytes(message.as_bytes())


def public_prices(need, snapshot):
    pricing = PricingPolicy.model_validate_json((ROOT / 'artifacts/pricing' / (snapshot['site_id'] + '.json')).read_text(encoding='utf-8'))
    text, items = retail_options(need, OfferSnapshot.model_validate(snapshot), snapshot['site_id'], pricing)
    return text, [item['internal']['supplier_offer_id'] for item in items]


async def dialogue(client, lab, persona, manifest, directory, patch=""):
    cfg = settings()
    auth = {"Authorization": f"Bearer {cfg.worker_secret}"}
    site_id = manifest.site_id
    result = await client.post(f"/internal/sites/{site_id}/simulation", headers=auth, json={
        "mode": "simulation", "knowledge": manifest.model_dump(), "notice_version": "local-client-lab-v1", "consent": True})
    result.raise_for_status()
    session = result.json()
    prefix = f"/internal/sites/{site_id}/sessions/{session['conversation_id']}"

    async def post(action, body):
        response = await client.post(prefix + action, headers=auth, json=body)
        response.raise_for_status()
        return response.json()

    owner = "client-lab-" + str(uuid4())
    context = await post("/claim", {"owner": owner})
    received_release_hash = context['release_hash']
    history, tools, errors, contact_receipts = [], [], [], []
    instruction = context["prompt"] + "\n" + patch + "\nTu atsakai klientui tekstu. "
    instruction += "JSON calls yra prašymai core. arguments yra struktūruotas objektas, ne JSON string. "
    instruction += "need.patch.fields yra sąrašas {field,value}; kitų įrankių arguments atitinka schemą. "
    instruction += "Poreikį registruok pagal kliento žodžius, kiekį skaitmenimis; naudok pateiktą kliento evidence ID. "
    instruction += "need.patch.fields reikšmės VISOS yra string, įskaitant quantity (pvz. \"2\"). "
    instruction += "Kai reikia tool, grąžink tuščią reply ir calls; po kvito atsakyk. Negali skelbti formos shown prieš ACK."
    profile = profiles.get(site_id, manifest.canonical_host)
    field_names = sorted(profile.need_fields)
    instruction += " need.patch.fields leistini TIK šie tikslūs raktai: " + ", ".join(field_names)
    instruction += ". kitų raktų, pavyzdžiui tire_size, position, vehicle, usage, request, nekurk."
    instruction += " Laukų taisyklės: " + json.dumps(profile.field_notes or {}, ensure_ascii=False)
    for turn_number, message in enumerate(persona["messages"]):
        context = await post("/claim", {"owner": owner})
        async with db.transaction((await service.business(site_id)).id, cfg.environment) as tx:
            await knowledge.register(tx, await service.business(site_id), manifest)
        receipt = await post("/events", {"epoch": context["epoch"], "event_key": f"client-{turn_number}",
            "kind": "client_transcript", "text": message})
        history.append({"speaker": "client", "text": message, "event_id": receipt["event_id"]})
        for step in range(3):
            response = await client.get(prefix, headers=auth)
            response.raise_for_status()
            state = response.json()
            # No synthetic/test/persona/holdout labels or contact values enter assistant input.
            schema = turn_schema(site_id, receipt['event_id'], state['need_revision'])
            routing_hint = state.get('routing', {}).get('hint')
            if routing_hint:
                routing_hint = {k: routing_hint[k] for k in ['intent', 'confidence', 'suggested_role', 'suggested_tools']}
            decision = await lab.ask(schema, instruction + customer_language.instruction(state.get('language_hint')) +
                '\nA routing_hint is optional advisory context from Jev. It never expands tool permissions, '
                'establishes facts/consent or overrides the actual customer messages. Ignore an irrelevant hint.',
                {"history": history, "tool_results": tools[-8:], "routing_hint": routing_hint,
                "need": state["need"], "need_revision": state["need_revision"], "ui": state["ui"],
                "latest_client_event_id": receipt["event_id"], "allowed_tools": state["allowed_tools"],
                "need_patch_schema": NeedPatch.model_json_schema(), "allowed_need_fields": field_names})
            if routing_hint:
                tools.append({'name': 'routing.hint', 'result': {**routing_hint, 'hint_used': True}})
            context = await post("/claim", {"owner": owner})
            if not decision.calls:
                if not decision.reply.strip():
                    errors.append("empty_reply")
                    break
                await post("/events", {"epoch": context["epoch"], "event_key": f"agent-{turn_number}-{step}",
                    "kind": "agent_transcript", "text": decision.reply})
                history.append({"speaker": "agent", "text": decision.reply})
                break
            for call in decision.calls:
                try:
                    arguments = core_arguments(call)
                except ValueError:
                    tools.append({"name": call.name, "error": "invalid_json"})
                    errors.append("invalid_tool_arguments")
                    continue
                response = await client.post(prefix + "/tools", headers=auth, json={"epoch": context["epoch"],
                    "call_id": str(uuid4()), "name": call.name, "arguments": arguments})
                output = response.json()
                if response.status_code >= 400:
                    errors.append(f"tool_http_{response.status_code}")
                elif call.name == "ui.open_contact_form":
                    output["ui_ack"] = await signed(client, session, "ui", {"request_id": output["request_id"], "state": "shown"}, site_id)
                    if persona['contact'] and persona.get('contact_at') == 'during' and not contact_receipts:
                        channels = persona.get('contact_channels', ['email'])
                        for channel in channels:
                            value = persona['recipient'] if channel == 'email' else persona['phone']
                            saved = await signed(client, session, 'contact', {'channel': channel, 'value': value,
                                'consent': True, 'notice_version': 'local-client-lab-v1'}, site_id)
                            contact_receipts.append({'channel': channel, 'saved': True, 'timing': 'during'})
                            # Only the receipt enters model input, never the actual contact value.
                            output['contact_receipt'] = {'channels_saved': channels, 'state': saved.get('state', 'saved')}
                tools.append({"name": call.name, "arguments": arguments, "result": output, 'turn': turn_number})
        else:
            errors.append("tool_loop_limit")
    await signed(client, session, "end", {}, site_id)
    if persona["contact"] and persona.get('contact_at', 'after') == 'after':
        await signed(client, session, "contact", {"channel": "email", "value": persona["recipient"],
            "consent": True, "notice_version": "local-client-lab-v1"}, site_id)
        contact_receipts.append({'channel': 'email', 'saved': True, 'timing': 'after'})
    return {"id": persona["id"], "label": persona["label"], "split": persona["split"],
            "site_id": site_id, "contact": any(r['channel'] == 'email' for r in contact_receipts),
            "contact_receipts": contact_receipts, "requested_contact_timing": persona.get('contact_at', 'after'),
            "expected_contact_channels": persona.get('contact_channels', ['email']) if persona['contact'] else [],
            "expected_need": persona["expected_need"],
            'refusal_at': persona.get('refusal_at', 0),
            'refusal': persona.get('refusal', False),
            "conversation_id": session["conversation_id"], "history": history, "tools": tools, "errors": errors,
            'received_release_hash': received_release_hash}


async def postcall(lab, item, row, snapshot, directory):
    data = await jobs.load_input(item.id, row["conversation_id"])
    safe = {key: data[key] for key in ["evidence", "knowledge", "need", "coverage", "release_hash"]}
    safe["runtime_capabilities"] = {"email_contact_capture": True, "phone_contact_capture": True,
        "sms_delivery": False, "automatic_callback": False, "commercial_order_tools": False}
    safe["contact_receipt"] = {"email_saved": row["contact"]}
    analysis = await reviewed_output(lab, Analysis, "Analyse the client's need in Lithuanian. Write a professional concise follow-up "
        "with concrete next steps, client evidence IDs only, approved facts only. No invented suppliers, prices or guarantees. "
        "Do not say a need was saved when the tools did not save it. Don't promise staff checks or capabilities. "
        "The recipient's email has ALREADY been provided when contact_receipt.email_saved is true; do not ask for it again.", safe, data, True)
    quality = await reviewed_output(lab, Quality, "Independently review the assistant conversation in Lithuanian. Check AI disclosure, "
        "helpfulness, correction of dimensions, respectful contact invitation/refusal, no fictional purchases, no foreign data. "
        "Use IDs only from evidence, NOT knowledge page IDs. Give a bounded communication improvement. "
        "Issues describe observed problems only. Audio/delivery unavailable is coverage, not a dialogue violation. "
        "AI disclosure once per conversation is enough. Tool execution failures are issues when supplied.",
        {**safe, "tool_receipts": row["tools"], "observed_tool_errors": row["errors"]}, data)
    for kind in ['analysis', 'quality'] + (['followup'] if row['contact'] else []):
        task = await jobs.claim_job(item.id, "codex-client-lab", kind=kind)
        if not task:
            raise RuntimeError("lab_job_missing")
        if task["kind"] == "followup":
            await jobs.prepare_followup(item.id, task, data)
        else:
            value = analysis.model_dump() if task["kind"] == "analysis" else quality.model_dump()
            await jobs.complete_artifact(item.id, task, {**value, "engine": "codex_cli_text_lab",
                "release_hash": data["release_hash"], "coverage": data["coverage"], "audio_quality": "not_measured",
                "draft_only": True, "auto_promotion": False})
    row.update(analysis=analysis.model_dump(), quality=quality.model_dump(), need=data["need"])
    if row["contact"]:
        async with db.transaction(item.id, settings().environment) as tx:
            artifact = await tx.scalar(select(Artifact).where(Artifact.conversation_id == row["conversation_id"], Artifact.kind == "followup"))
            row["actual_core_followup"] = artifact.payload
        body, selected = public_prices(data["need"], snapshot)
        # Offer details are rendered from verified snapshot fields; free model text never adds a price.
        row["proposed_email"] = {"subject": "Preliminarūs variantai pagal jūsų poreikį" if selected else analysis.subject,
            "body": analysis.body + body + "\n\nJei vienas variantas domina, atsakykite į šį laišką ir nurodykite jį. "
            "Trūkstamus duomenis ir pardavėjo sąlygas reikės patikslinti prieš galutinį pasirinkimą.\n",
            "state": "local_draft_only", "public_offer_ids": selected, "sent": False}
        email_capture(directory, row["id"], row["proposed_email"], row["recipient"])
    else:
        row["proposed_email"] = None
    row["checks"] = {"no_core_tool_errors": not row["errors"],
        "requested_contact_captured": {r['channel'] for r in row['contact_receipts']} == set(row['expected_contact_channels']),
        "correct_need": all("".join(row["need"].get(key, {}).get("value", "").upper().split()) ==
            "".join(expected.upper().split()) for key, expected in row["expected_need"].items()),
        "no_email_without_contact": row["contact"] or row["proposed_email"] is None,
        "independent_reviewer_helpful": quality.outcome == "helpful" and not quality.issues}
    async with db.transaction(item.id, settings().environment) as tx:
        row["calibration_artifacts"] = [{"kind": a.kind, "payload": a.payload} for a in
            await tx.scalars(select(Artifact).where(Artifact.conversation_id == row["conversation_id"],
                Artifact.kind.like("static_eval:%")))]


def write_report(directory, rows, lab, round_number):
    report = {"date": "2026-10-01", "round": round_number, "assistant_engine": "codex_cli_local_default",
        "gemini_verified": False, "synthetic_core_scope": True, "assistant_sees_test_flag": False,
        "smtp_sent": False, "supplier_contacted": False, "cli_calls": lab.calls, "cli_usage": lab.usage,
        "clients": rows, "all_checks_pass": all(all(r.get("checks", {"pending": False}).values()) for r in rows)}
    (directory / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    cards = []
    for row in rows:
        dialogue_text = "\n\n".join(f"{line['speaker'].upper()}: {line['text']}" for line in row["history"])
        mail = row.get("proposed_email")
        cards.append(f"<article><h2>{escape(row['label'])}</h2><p>{escape(json.dumps(row.get('checks', {}), ensure_ascii=False))}</p>"
                     f"<details><summary>Pokalbis</summary><pre>{escape(dialogue_text)}</pre></details>"
                     f"<h3>Laiško juodraštis</h3><pre>{escape(mail['body']) if mail else 'Nesiunčiama: kontakto nėra arba apdorojimas nebaigtas.'}</pre>"
                     f"<details><summary>Kokybės vertinimas</summary><pre>{escape(json.dumps(row.get('quality', {}), ensure_ascii=False, indent=2))}</pre></details></article>")
    html = '<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Šešių klientų bandymas</title>'
    html += '<style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:0 20px;background:#f5f5ef;color:#22302b}article{background:white;padding:24px;margin:24px 0;border:1px solid #ccc;border-radius:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.6 system-ui}summary{cursor:pointer}p{overflow-wrap:anywhere}</style>'
    html += f'<h1>Šešių klientų tekstinis bandymas · ciklas {round_number}</h1><p>Vietiniai sintetiniai klientai. Codex CLI, ne Gemini. Laiškai neišsiųsti; pirkimų ir tiekėjų derybų nebuvo.</p>'
    (directory / "index.html").write_text(html + "".join(cards) + "</html>", encoding="utf-8")


async def reviewed_output(lab, schema, instruction, safe, data, client_only=False):
    schema = bound_schema(schema, data, client_only)
    for attempt in range(2):
        value = await lab.ask(schema, instruction, safe)
        try:
            jobs.check_evidence(value, data, client_only=client_only)
            return value
        except ValueError:
            if attempt:
                raise
            safe = {**safe, "validation_error": "Reference supplied evidence IDs only; do not use page IDs.",
                    "allowed_evidence_ids": [e["id"] for e in data["evidence"]
                        if not client_only or e["speaker"] == "client"]}
    raise RuntimeError("review_exhausted")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, choices=[1, 2], default=1)
    parser.add_argument("--clients", type=Path, default=ROOT / "evals/clients.json")
    parser.add_argument("--offers", type=Path, default=ROOT / "evals/public-offers.json")
    parser.add_argument('--patch-file', type=Path)
    args = parser.parse_args()
    cfg = settings()
    if cfg.environment != "local" or cfg.voice_enabled or cfg.smtp_enabled:
        raise RuntimeError("local_voice_off_smtp_off_required")
    fixtures = json.loads(args.clients.read_text(encoding="utf-8"))
    clients = fixtures["clients"]
    for persona in clients:
        persona["recipient"] = cfg.lab_mail_recipient or fixtures["test_recipient"]
    snapshot = json.loads(args.offers.read_text(encoding="utf-8"))
    if snapshot["site_id"] != fixtures["site_id"]:
        raise RuntimeError("cross_site_offer_fixture")
    item = await service.business(fixtures["site_id"])
    async with db.transaction(item.id, cfg.environment) as tx:
        projection = await knowledge.projection(tx)
    if not projection:
        await knowledge.refresh_from_edge(item)
        async with db.transaction(item.id, cfg.environment) as tx:
            projection = await knowledge.projection(tx)
    if not projection:
        raise RuntimeError("current_approved_manifest_missing")
    manifest = Knowledge.model_validate({k: v for k, v in projection.items() if k != "knowledge_revision"})
    run_id = str(uuid4())
    cfg.environment, cfg.allow_simulation = "client-lab-" + run_id, True
    base = ROOT / "artifacts/client-lab" / run_id
    base.mkdir(parents=True)
    lab, patch = CodexLab(max_calls=90, timeout=180), ""
    if args.patch_file:
        patch = json.loads(args.patch_file.read_text(encoding='utf-8'))['instruction']
        from pinet_core.calibration import FORBIDDEN
        if not 10 <= len(patch) <= 1000 or FORBIDDEN.search(patch):
            raise ValueError('restricted_experimental_patch')
    try:
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://core.lab") as client:
                for cycle in range(1, args.rounds + 1):
                    directory = base / f"round-{cycle}"
                    directory.mkdir()
                    rows = []
                    for persona in clients:
                        async with db.transaction(item.id, cfg.environment) as tx:
                            await knowledge.register(tx, item, manifest)
                        row = await dialogue(client, lab, persona, manifest, directory, patch)
                        row["recipient"] = persona["recipient"]
                        async with db.transaction(item.id, cfg.environment) as tx:
                            await knowledge.register(tx, item, manifest)
                        rows.append(row)
                        write_report(directory, rows, lab, cycle)
                        try:
                            await postcall(lab, item, row, snapshot, directory)
                        except Exception as error:
                            row["failure"] = type(error).__name__
                            write_report(directory, rows, lab, cycle)
                            raise
                        write_report(directory, rows, lab, cycle)
                        print(json.dumps({"client": persona["id"], "cycle": cycle, "checks": row["checks"], "preview": str(directory / "index.html")}), flush=True)
                    if cycle == 1 and args.rounds == 2:
                        # Calibrator sees training cases only. Holdout stays outside its prompt.
                        training = [{"quality": r["quality"], "history": r["history"]} for r in rows if r["split"] == "train"]
                        proposal = await lab.ask(Quality, "Based only on supplied training dialogues, suggest one concise "
                            "Lithuanian clarification/turn-taking/contact-invitation instruction. Do not change facts, rights, "
                            "prices, contact consent or the base AI disclosure. improvement_hint holds the instruction. "
                            "Keep evidence_event_ids empty for this aggregate review.", {"training": training})
                        from pinet_core.calibration import FORBIDDEN
                        if proposal.improvement_hint and not FORBIDDEN.search(proposal.improvement_hint):
                            patch = proposal.improvement_hint
                        (base / "experimental-patch.json").write_text(json.dumps({"instruction": patch,
                            "hash": digest(patch), "scope": proposal.suggested_scope, "production_activated": False,
                            "training_clients": 3, "holdout_clients": 3}, ensure_ascii=False, indent=2), encoding="utf-8")
    finally:
        async with db.transaction(item.id, cfg.environment) as tx:
            for table in [Case, KnowledgeState, BusinessPolicy, PolicyRevision]:
                await tx.execute(delete(table))
        async with db.registry() as tx:
            await tx.execute(delete(Admission).where(Admission.environment_id == cfg.environment))
            await tx.execute(delete(CostReservation).where(CostReservation.environment_id == cfg.environment))
        await db.engine.dispose()
    print(json.dumps({"status": "completed", "directory": str(base), "cli_calls": lab.calls,
        "gemini_test": False, "smtp_sent": False, "production_patch_activated": False}), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
