"""Dry-run model identity audit. Never changes catalogue or queues."""
import argparse, collections, csv, hashlib, html, json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs


def variant_identity(url):
    parsed = urlparse(url or '')
    params = parse_qs(parsed.fragment, keep_blank_values=True)
    if not params.get('ban') or not params.get('sid') or 'ovc' not in params:
        return None, 'MISSING_EXPLICIT_BAN_SERIES_OR_INITIAL_VARIANT'
    if any(len(params[k]) != 1 for k in ('ban', 'sid', 'ovc')):
        return None, 'AMBIGUOUS_REPEATED_IDENTITY_PARAMETER'
    fields = {}
    for assignment in params['ovc'][0].split(';'):
        if not assignment.strip():
            continue
        if '=' not in assignment:
            return None, 'UNPARSEABLE_VARIANT'
        field, value = assignment.split('=', 1)
        # The existing supplier insertion adapter explicitly translates GUI
        # enum _4/_22/_207Y to OFML 4/22/207Y. Apply only that proven alias.
        if len(value) > 1 and value[0] == '_' and value[1].isdigit():
            value = value[1:]
        if field in fields and fields[field] != value:
            return None, 'CONFLICTING_VARIANT_ASSIGNMENTS'
        fields[field] = value
    # Assignment order, URL percent encoding and UI language do not select a
    # different variant. Values, property names and explicit defaults stay exact.
    return (parsed.hostname, params['sid'][0], params['ban'][0], tuple(sorted(fields.items()))), None


def audit(web):
    seed = json.loads((web/'content/seed.json').read_text(encoding='utf8'))
    snapshot = json.loads((web/'content/admin-source-status.json').read_text(encoding='utf8'))
    sources = {m['key']: m for m in snapshot['models']}
    rows = []
    for p in seed['products']:
        for c in p['configurations'] or [{'id': 'product'}]:
            key = p['id']+':'+c['id']
            s = sources[key]
            identity, error = variant_identity(c.get('configurator'))
            if identity and identity[2] != c.get('code'):
                identity, error = None, 'BAN_DIFFERS_FROM_STORED_ARTICLE'
            score = (int(s['geometryAccepted']), int(s['optionsReady']), int(s['geminiReady']),
                     len(s.get('paragraphs', [])), sum(map(len, s.get('paragraphs', []))),
                     len(c.get('gallery', []))+len(p.get('documents', [])), int(bool(c.get('image') or p.get('image'))), int(s['active']))
            rows.append(dict(key=key, productId=p['id'], configurationId=c['id'], name=s['name'],
                             categorySlug=p['categorySlug'], path=s['path'], active=s['active'], code=c.get('code'),
                             brand=p.get('brand'), sourceUrl=c.get('configurator'), identity=identity,
                             identityError=error, score=score,
                             evidence=dict(geometry=s['geometryAccepted'], options=s['optionsReady'], gemini=s['geminiReady'],
                                           paragraphs=len(s.get('paragraphs', [])), proseCharacters=sum(map(len, s.get('paragraphs', []))),
                                           gallery=len(c.get('gallery', [])), documents=len(p.get('documents', [])))))
    exact, products = collections.defaultdict(list), collections.defaultdict(list)
    for row in rows:
        if row['identity']:
            identity = (row['brand'], *row['identity'])
            exact[identity].append(row)
            products[identity[:-1]].append(row)
    groups = []
    for identity, members in exact.items():
        if len(members) < 2:
            continue
        ordered = sorted(members, key=lambda r: (tuple(-v for v in r['score']), r['key']))
        keeper, retired = ordered[0], ordered[1:]
        groups.append(dict(group='D'+str(len(groups)+1).zfill(3), article=keeper['code'],
                           keeper=keeper, proposedRemove=retired,
                           activeMembers=sum(r['active'] for r in members),
                           reason='Tas pats tiekėjas, serija, ban/artikulas ir tiksliai tas pats pradinis variantas. Paliekamas pilniausias pagal 3D, opcijų, Gemini ir teksto įrodymus.',
                           identitySha256=hashlib.sha256(repr(identity).encode()).hexdigest()))
    possible = []
    for identity, members in products.items():
        variants = {r['identity'][-1] for r in members}
        if len(variants) < 2:
            continue
        all_fields = {k for v in variants for k, _ in v}
        changed = sorted(k for k in all_fields if len({dict(v).get(k) for v in variants}) > 1)
        possible.append(dict(group='G'+str(len(possible)+1).zfill(3), article=identity[-1], series=identity[-2],
                             differences=changed, classification='Tik FINISHES skiriasi' if all(k.rsplit('.',1)[0].endswith('_FINISHES') for k in changed) else 'Skiriasi komplektacija arba apdaila',
                             members=members, variants=len(variants), action='NELIESTI — tik galimi dublikatai'))
    active = [r for r in rows if r['active']]
    removed = {r['key'] for g in groups for r in g['proposedRemove']}
    # Model removals can include historical-only records. Catalogue delta is
    # computed separately, promoting a fuller historical keeper if proposed.
    active_after = {r['key']:r for r in active}
    for group in groups:
        if group['activeMembers']:
            for row in [group['keeper'], *group['proposedRemove']]:
                active_after.pop(row['key'], None)
            active_after[group['keeper']['key']] = group['keeper']
    counts = lambda records: dict(total=len(records), chairs=sum(r['categorySlug']=='kedes' for r in records),
                                  nonchairs=sum(r['categorySlug']!='kedes' for r in records))
    return dict(at=datetime.now(timezone.utc).isoformat(), dryRun=True, approvalRequired=True,
                inputs={f:hashlib.sha256((web/'content'/f).read_bytes()).hexdigest() for f in ['seed.json','catalog-consolidation.json','admin-source-status.json']},
                counts=dict(originals=counts(rows), currentCatalogue=counts(active),
                            afterExactDedupOriginals=counts([r for r in rows if r['key'] not in removed]),
                            afterExactDedupCatalogue=counts(list(active_after.values())),
                            exactGroups=len(groups), exactRedundantOriginals=len(removed),
                            exactRedundantActiveCards=len(active)-len(active_after), possibleGroups=len(possible),
                            possibleOriginalMembers=sum(len(g['members']) for g in possible), missingIdentity=sum(not r['identity'] for r in rows)),
                exact=groups, possible=possible, missing=[r for r in rows if not r['identity']],
                caveats=['1111 admin rows include all historical originals; public catalogue already uses797active cards.',
                         'Current consolidation groups by productId plus article, which is broader than exact initial-variant equality.',
                         'Missing or different explicit initial assignments are not assumed equivalent without source proof.',
                         'No catalogue, approval, redirect, queue or source data was changed by this audit.'])


def write_report(result, output):
    output.mkdir(parents=True, exist_ok=True)
    (output/'DUPLICATES.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    lines = ['# Ergonomic.lt dublikatų auditas — tik peržiūrai', '', json.dumps(result['counts'], ensure_ascii=False, indent=2), '',
             'Nieko nepakeista. Tikslūs dublikatai šalinami tik savininkui patvirtinus konkretų sąrašą.', '',
             '## Tikslūs dublikatai', '', '| Grupė / artikulas | Palikti | Šalinti | Kodėl |', '|---|---|---|---|']
    label = lambda m: f"{m['name']} · {m['configurationId']} ({'aktyvus' if m['active'] else 'istorinis'})"
    for g in result['exact']:
        lines.append(f"| {g['group']} / {g['article']} | {label(g['keeper'])} | {'; '.join(label(m) for m in g['proposedRemove'])} | {g['reason']} |")
    if not result['exact']:
        lines.append('| — | — | — | Pagal tikslų ban + pradinį variantą dublikatų nerasta. |')
    lines += ['', '## Nepatikrinta pradinė tapatybė — NIEKO NEŠALINTI', '', '| Modelis | ID | Priežastis |', '|---|---|---|']
    for m in result['missing']:
        lines.append(f"| {m['name']} | {m['configurationId']} | {m['identityError']} |")
    lines += ['', '## Galimi dublikatai — NELIESTI', '', '| Grupė / artikulas | Modeliai | Skirtumai |', '|---|---|---|']
    for g in result['possible']:
        lines.append(f"| {g['group']} / {g['article']} | {'; '.join(label(m) for m in g['members'])} | {g['classification']}: {', '.join(g['differences'])} |")
    (output/'ATASKAITA.md').write_text('\n'.join(lines)+'\n', encoding='utf8')
    with (output/'TIKSLUS-DUBLIKATAI.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream, delimiter=';')
        writer.writerow(['Grupė','Artikulas','Palikti','Šalinti','Priežastis'])
        for g in result['exact']:
            writer.writerow([g['group'],g['article'],label(g['keeper']),'; '.join(label(m) for m in g['proposedRemove']),g['reason']])
    def table(groups, possible=False):
        parts = ['<table><thead><tr><th>Grupė / artikulas</th><th>'+('Modeliai' if possible else 'Palikti')+'</th><th>'+('Skirtumai — neliesti' if possible else 'Siūloma pašalinti')+'</th></tr></thead><tbody>']
        for g in groups:
            members = g['members'] if possible else [g['keeper']]
            links = lambda ms: '<br>'.join('<a href="https://ergonomic-preview.pinet-azprekyba.workers.dev'+html.escape(m['path'], quote=True)+'">'+html.escape(label(m))+'</a>' for m in ms)
            parts.append('<tr><td>'+html.escape(g['group']+' · '+str(g['article']))+'</td><td>'+links(members)+'</td><td>'+(html.escape(g['classification']+'; '+', '.join(g['differences'])) if possible else links(g['proposedRemove']))+'</td></tr>')
        return ''.join(parts)+'</tbody></table>'
    markup = '<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ergonomic.lt dublikatų auditas</title><style>body{font:16px/1.6 system-ui;color:#183f34;background:#f5f7f3;max-width:1500px;margin:32px auto;padding:24px}table{width:100%;border-collapse:collapse;background:white}td,th{text-align:left;vertical-align:top;padding:16px;border:1px solid #cbd8ce}a{color:#145747}pre{white-space:pre-wrap}</style><h1>Dublikatų auditas</h1><p>Tik pasiūlymas. Katalogas, eilės ir šaltiniai nepakeisti. Reikia savininko patvirtinimo.</p><pre>'+html.escape(json.dumps(result['counts'],ensure_ascii=False,indent=2))+'</pre><h2>Tikslūs dublikatai</h2>'+table(result['exact'])+'<h2>Galimi dublikatai — neliesti</h2>'+table(result['possible'],True)+'</html>'
    (output/'ATASKAITA.html').write_text(markup, encoding='utf8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--web', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = audit(args.web)
    write_report(result, args.output)
    print(json.dumps(result['counts'], ensure_ascii=True))
