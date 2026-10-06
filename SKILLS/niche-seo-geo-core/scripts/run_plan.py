"""Execute a reviewed Treg data-call manifest, retaining evidence and settled costs.
Dry-run by default. Never supplies credentials, auto-topups, or retries calls.
"""
import argparse, datetime, hashlib, json, pathlib, subprocess, sys, os
from decimal import Decimal

def micro(value):
    return int(Decimal(str(value))*1000000)

def cli(args, timeout=150, trace=None):
    env=dict(os.environ);env['PYTHONIOENCODING']='utf-8';env['PYTHONUTF8']='1'
    p=subprocess.run(['treg','--json',*args],capture_output=True,encoding='utf-8',errors='replace',timeout=timeout,env=env)
    if trace is not None:
        pathlib.Path(str(trace)+'.stdout.txt').write_text(p.stdout,encoding='utf-8')
        pathlib.Path(str(trace)+'.stderr.txt').write_text(p.stderr,encoding='utf-8')
    try:d=json.loads(p.stdout)
    except ValueError:raise RuntimeError('CLI returned non-JSON; preserve/recover the call before any retry: '+p.stderr[:500])
    return p.returncode,d

def run():
    a=argparse.ArgumentParser()
    a.add_argument('--plan',required=True);a.add_argument('--out',required=True)
    a.add_argument('--budget-usd',required=True,type=Decimal)
    a.add_argument('--execute',action='store_true')
    o=a.parse_args();sys.stdout.reconfigure(encoding='utf-8')
    plan=json.loads(pathlib.Path(o.plan).read_text(encoding='utf-8-sig'))
    tasks=plan['calls'];budget=micro(o.budget_usd)
    if budget<0:raise ValueError('Budget cannot be negative')
    if len({t['id'] for t in tasks})!=len(tasks):raise ValueError('Duplicate manifest ids')
    if any(t.get('purpose')!='research-read' for t in tasks):raise ValueError('Only reviewed research-read calls supported; this label is not authorization')
    if any(micro(t['ceiling_usd'])<0 for t in tasks):raise ValueError('Negative ceiling')
    ceiling=sum(micro(t['ceiling_usd']) for t in tasks)
    if ceiling>budget:raise ValueError('Manifest ceilings exceed authorized budget')
    print(json.dumps({'mode':'execute' if o.execute else 'dry-run','calls':len(tasks),'reserve_ceiling_usd':ceiling/1e6,'budget_usd':budget/1e6,'note':'Request reserve caps are not a universal guarantee on usage settlement; use bounded inputs and conservative ceilings.'}))
    if not o.execute:return
    out=pathlib.Path(o.out).resolve();out.mkdir(parents=True,exist_ok=True)
    lock=out/'RUNNING.lock'
    try:lock.touch(exist_ok=False)
    except FileExistsError:raise RuntimeError('Existing run lock: inspect unfinished call before resuming')
    uncertain=False
    try:
        _,balance=cli(['balance'])
        (out/'balance-before.json').write_text(json.dumps(balance,indent=2),encoding='utf-8')
        pending_ceiling=0
        for t in tasks:
            saved_path=out/(hashlib.sha256(t['id'].encode()).hexdigest()[:16]+'.json')
            if not saved_path.exists():pending_ceiling+=micro(t['ceiling_usd'])
        if micro(balance['balance_usd'])<pending_ceiling:raise RuntimeError('Available Treg balance below remaining manifest ceilings; reduce/review plan')
        records=[];spent=0
        for t in tasks:
            request={'endpoint':t['endpoint'],'method':t.get('method','POST'),'body':t.get('body'),'query':t.get('query',{}),'headers':t.get('headers',{})}
            fingerprint=hashlib.sha256(json.dumps(request,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
            name=hashlib.sha256(t['id'].encode()).hexdigest()[:16]
            destination=out/(name+'.json');request_path=out/(name+'.request.json')
            if destination.exists():
                saved=json.loads(destination.read_text(encoding='utf-8'))
                if saved['fingerprint']!=fingerprint:raise RuntimeError('Existing result has a different request; use a new run directory')
                if saved.get('state')!='complete':raise RuntimeError('Uncertain saved result requires manual recovery')
                records.append(saved);spent+=saved['charged_micro']
                continue
            if request_path.exists():raise RuntimeError('Unfinished request exists; recover via call id/idempotency before rerunning')
            limit=micro(t['ceiling_usd'])
            if spent+limit>budget:raise RuntimeError('Remaining budget cannot cover next call')
            idempotency=fingerprint[:16]+'-'+name+'-'+out.name
            record={'id':t['id'],'fingerprint':fingerprint,'idempotency_key':idempotency,'request':request,'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ceiling_micro':limit,'state':'started'}
            request_path.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
            args=['call',t['endpoint'],'--method',request['method'],'--header','X-Treg-Route-Max-Cost: '+str(t['ceiling_usd']),'--header','Idempotency-Key: '+idempotency]
            if request['body'] is not None:
                bodyfile=out/(name+'.body.json');bodyfile.write_text(json.dumps(request['body'],ensure_ascii=False),encoding='utf-8');args+=['--file',str(bodyfile)]
            for k,v in request['query'].items():args+=['--query',str(k)+'='+str(v)]
            for k,v in request['headers'].items():
                if k.lower() in ['authorization','x-treg-token','idempotency-key','x-treg-route-max-cost']:raise ValueError('Credential/control headers cannot be overridden')
                args+=['--header',k+': '+str(v)]
            uncertain=True
            code,data=cli(args,timeout=240,trace=out/name)
            meta=data.get('_treg',{})
            charged=meta.get('charged_micro')
            if charged is None:raise RuntimeError('Settlement unknown or async pending; preserve call and poll/recover, do not resubmit')
            record.update(state='complete',exit_code=code,response=data,charged_micro=int(charged),finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
            destination.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
            uncertain=False;spent+=int(charged);records.append(record)
            ledger={'budget_micro':budget,'charged_micro':spent,'calls':[{k:r.get(k) for k in ['id','charged_micro','exit_code','fingerprint']} for r in records]}
            (out/'ledger.json').write_text(json.dumps(ledger,indent=2),encoding='utf-8')
            print(json.dumps({'id':t['id'],'http_status':meta.get('http_status'),'charged_usd':int(charged)/1e6,'spent_usd':spent/1e6}),flush=True)
            if spent>budget:raise RuntimeError('Settlement exceeded budget: stop; no additional requests')
            if meta.get('http_status') in [401,402,403]:raise RuntimeError('Access/balance/cap refusal; stop and inspect')
        _,balance=cli(['balance']);(out/'balance-after.json').write_text(json.dumps(balance,indent=2),encoding='utf-8')
    finally:
        if not uncertain:lock.unlink(missing_ok=True)

if __name__=='__main__':run()
