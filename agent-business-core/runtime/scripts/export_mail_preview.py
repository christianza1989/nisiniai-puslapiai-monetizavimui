"""Owner's read-only synthetic mail snapshot. Never exports non-test cases."""
import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from pinet_core import mailbox
from pinet_core.attachments import pdf_bytes
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Business, Case, MailMessage


async def main():
    if settings().environment != "local":
        raise RuntimeError("local_synthetic_preview_only")
    async with db.registry() as tx:
        sites = list(await tx.scalars(select(Business).order_by(Business.site_id)))
    entries = []
    target = Path("artifacts/mail-console-preview")
    target.mkdir(parents=True, exist_ok=True)
    for site in sites:
        async with db.transaction(site.id, settings().environment) as tx:
            query = select(MailMessage).join(Case, MailMessage.case_id == Case.id).where(
                Case.payload["source"].astext.in_(["text_client_lab", "owner_order_test", "owner_sales_lab"]),
                Case.payload["test"].as_boolean().is_(True)
            ).order_by(MailMessage.created_at.desc()).limit(100)
            for message in await tx.scalars(query):
                entry = {**mailbox.public(message, detail=True), "site_id": site.site_id}
                for index, attachment in enumerate(message.payload.get('attachments', [])):
                    if attachment.get('content_type') == 'application/pdf':
                        filename = message.id + '-' + str(index) + '.pdf'
                        (target / filename).write_bytes(pdf_bytes(attachment))
                        entry['attachments'][index]['preview_file'] = filename
                entries.append(entry)
    await db.engine.dispose()
    data = json.dumps({"sites": [{"id": s.site_id, "host": s.canonical_host} for s in sites], "messages": entries}, ensure_ascii=False).replace("<", "\\u003c")
    html = '''<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Bendras verslų paštas</title>
<style>body{font:16px system-ui;background:#f5f5ef;color:#25382c;margin:0}main{max-width:1220px;padding:30px;margin:auto}select,button{font:inherit;padding:12px;border:1px solid #abb6a5;border-radius:7px}#layout{display:grid;grid-template-columns:340px 1fr;gap:22px;margin-top:24px}#list button{display:block;text-align:left;width:100%;background:white;color:#25382c;margin:8px 0;cursor:pointer}article{background:white;padding:28px;border:1px solid #d1d8cd;border-radius:9px}pre{font:16px/1.65 system-ui;white-space:pre-wrap;overflow-wrap:anywhere}small{color:#667562}.note{background:#e6eddc;padding:16px;border-radius:8px}@media(max-width:760px){#layout{grid-template-columns:1fr}main{padding:14px}}</style>
<main><h1>Bendras verslų paštas</h1><p class="note">Siuntėjas: info@pinet.lt</p>
<label>Verslas <select id="site"></select></label> <label>Vaizdas <select id="filter"><option value="customer">Klientų laiškai</option><option value="all">Visa istorija</option><option value="draft">Juodraščiai</option><option value="outbound">Siųsti / būsena</option><option value="inbound">Gauti</option></select></label>
<div id="layout"><div id="list"></div><article id="detail"><h2>Pasirinkite laišką</h2><p>Pamatysite kliento poreikį, prekių variantus ir siuntimo būseną.</p></article></div></main>
<script>const data=DATA;const el=id=>document.getElementById(id);const labels={draft:'Juodraštis',accepted_by_smtp:'Priimtas pašto serverio',received:'Gautas',superseded:'Pakeistas naujesniu',sending:'Siunčiamas',rejected:'Atmestas',delivery_unknown:'Siuntimo rezultatas neaiškus'};const stateName=value=>labels[value]||value;for(const site of data.sites){const o=document.createElement('option');o.value=site.id;o.textContent=site.host;el('site').append(o)}
function render(){el('list').replaceChildren();for(const m of data.messages.filter(m=>m.site_id===el('site').value&&(el('filter').value==='customer'?m.customer_facing:el('filter').value==='all'||(el('filter').value==='draft'?m.state==='draft':m.direction===el('filter').value&&m.state!=='draft'&&m.state!=='superseded')))){const b=document.createElement('button');b.textContent=m.subject+' · '+stateName(m.state);b.onclick=()=>show(m);el('list').append(b)}if(!el('list').children.length)el('list').textContent='Šiame vaizde laiškų nėra.';el('detail').replaceChildren()}
function show(m){el('detail').replaceChildren();for(const [tag,text] of [['h2',m.subject],['p',m.sender+' → '+m.recipient],['small',stateName(m.state)+' · Užklausos kodas '+m.case_id],['pre',m.body]]){const n=document.createElement(tag);n.textContent=text;el('detail').append(n)}for(const a of m.attachments||[]){if(!a.preview_file)continue;const link=document.createElement('a');link.textContent='Atsisiųsti PDF';link.href=a.preview_file;link.download=a.filename;el('detail').append(link)}}
el('site').onchange=render;el('filter').onchange=render;el('site').value='traktoriupadangos';render();</script></html>'''.replace("DATA", data)
    (target / "index.html").write_text(html, encoding="utf-8")
    print(json.dumps({"synthetic_messages": len(entries), "non_test_cases_exported": False}))


if __name__ == "__main__":
    asyncio.run(main())
