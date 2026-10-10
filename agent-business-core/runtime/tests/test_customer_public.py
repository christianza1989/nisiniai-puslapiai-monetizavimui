"""Actual isolated PostgreSQL acceptance for customer identity and public allowlist."""
import asyncio
import json
import secrets
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, LoginBucket, Membership, Organization, Session, User
from pinet_core.control.routes import scope, token_hash
from pinet_core.control_api import app
from pinet_core.customer.admin import decide
from pinet_core.customer.models import Account, ActionToken, Intake
from pinet_core.db import db
from pinet_core.models import Business, utcnow
from pinet_core.public_projects.admin import approve, revoke, save
from pinet_core.public_projects.models import Project


@pytest.fixture
async def customers(monkeypatch):
    cfg = settings()
    env = 'test-' + str(uuid4())
    directory = Path('artifacts/qa-customer') / env
    for key, value in {'environment': env, 'control_enabled': True, 'control_mode': 'local',
                       'control_cursor_secret': secrets.token_hex(32), 'control_source_revision': 'a' * 40,
                       'customer_enabled': True, 'customer_portal_origin': 'http://127.0.0.1:3017',
                       'customer_outbox_directory': str(directory), 'public_projects_enabled': True,
                       'chat_enabled': False, 'chat_runner_enabled': False}.items():
        monkeypatch.setattr(cfg, key, value)
    db.engine = create_async_engine(cfg.database_url, pool_pre_ping=True)
    db.sessions = async_sessionmaker(db.engine, expire_on_commit=False)
    admin = create_async_engine(cfg.admin_database_url)
    try:
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://127.0.0.1:8855') as client:
                yield {'client': client, 'admin': admin, 'environment': env, 'outbox': directory,
                       'businesses': []}
    finally:
        async with AsyncSession(admin) as tx, tx.begin():
            for model in (Project, Organization, User, LoginBucket):
                await tx.execute(delete(model).where(model.environment_id == env))
            await tx.execute(delete(Business).where(Business.site_id.like('customer-qa-' + env + '%')))
        await admin.dispose()
        # Only our synthetic test outbox files; preserve other artifacts and failed runtime receipts.
        for file in directory.glob('*.json'):
            file.unlink()
        if directory.exists():
            directory.rmdir()


def registration(email=None):
    password = secrets.token_urlsafe(30)
    return {'email': email or uuid4().hex + '@example.com', 'password': password, 'password_confirm': password,
            'display_name': 'Synthetic customer', 'privacy_accepted': True}


def action_token(c, email, purpose):
    messages = [json.loads(p.read_text('utf-8')) for p in c['outbox'].glob('*.json')]
    matches = sorted((m for m in messages if m['recipient'] == email and m['purpose'] == purpose), key=lambda m:m['created_at'])
    assert matches
    link = urlsplit(matches[-1]['link'])
    assert link.scheme == 'http' and link.netloc == '127.0.0.1:3017' and not link.query
    return parse_qs(link.fragment)['token'][0]


async def registered(c, value=None):
    value = value or registration()
    response = await c['client'].post('/customer/v1/auth/register', json=value)
    assert response.status_code == 202, response.text
    return value, action_token(c, value['email'], 'verify')


async def verified(c):
    value, token = await registered(c)
    response = await c['client'].post('/customer/v1/auth/verify-email', json={'token':token})
    assert response.status_code == 200, response.text
    headers = await logged(c, value)
    me = (await c['client'].get('/customer/v1/me', headers=headers)).json()['data']
    return value, headers, me


async def logged(c, value):
    response = await c['client'].post('/customer/v1/auth/login', json={k:value[k] for k in ('email','password')})
    assert response.status_code == 200, response.text
    assert set(response.json()) == {'access_token','token_type','expires_at'}
    return {'Authorization':'Bearer ' + response.json()['access_token']}


def intake(me, **changes):
    return {'portfolio_id':me['portfolios'][0]['portfolio_id'], 'kind':'claim', 'display_name':'Synthetic proposed business',
            'canonical_host':'example.com', 'description':'Synthetic test request; no business ownership assertion.',
            'idempotency_key':str(uuid4()), **changes}


async def test_actual_signup_verify_login_empty_portfolio_and_hashes(customers):
    c, client = customers, customers['client']
    value, token = await registered(c)
    assert (await client.post('/customer/v1/auth/login', json={k:value[k] for k in ('email','password')})).status_code == 401
    async with AsyncSession(c['admin']) as tx:
        account = await tx.scalar(select(Account).where(Account.email == value['email'], Account.environment_id == c['environment']))
        user = await tx.get(User, account.user_id)
        assert not user.enabled and not account.verified_at
        assert user.password_hash.startswith('scrypt:131072:8:1:') and value['password'] not in user.password_hash
        assert not list(await tx.scalars(select(Membership).where(Membership.user_id == user.id)))
        row = await tx.scalar(select(ActionToken).where(ActionToken.token_hash == token_hash(token)))
        assert row.token_hash != token and row.expires_at - row.created_at <= timedelta(minutes=30)
        assert not list(await tx.scalars(select(Session).where(Session.user_id == user.id)))
    assert (await client.get('/customer/v1/auth/verify-email', params={'token':'redacted-test'})).status_code == 405
    response = await client.post('/customer/v1/auth/verify-email', json={'token':token})
    assert response.status_code == 200 and 'access_token' not in response.text
    assert (await client.post('/customer/v1/auth/verify-email', json={'token':token})).status_code == 400
    headers = await logged(c, value)
    me = (await client.get('/customer/v1/me', headers=headers)).json()['data']
    assert me['email_verified'] and len(me['portfolios']) == 1
    assert me['capabilities'] == ['portfolio.read','business_intake.create']
    p = me['portfolios'][0]['portfolio_id']
    assert (await client.get(f'/operator/v2/portfolios/{p}/businesses', headers=headers)).json()['data']['items'] == []
    # Internal customer username cannot bypass the verified customer login path.
    assert (await client.post('/operator/v2/auth/login', json={'username':user.username,'password':value['password']})).status_code == 401
    await db.engine.dispose()
    assert (await client.get('/customer/v1/me', headers=headers)).status_code == 200
    assert (await client.post('/operator/v2/auth/logout', headers=headers)).status_code == 204
    assert (await client.get('/customer/v1/me', headers=headers)).status_code == 401


async def test_duplicate_and_unknown_generic_receipts_and_resend(customers):
    c, client = customers, customers['client']
    value, old = await registered(c)
    duplicate = registration(value['email'].upper())
    response = await client.post('/customer/v1/auth/register', json=duplicate)
    assert response.status_code == 202 and response.json()['data'] == {'status':'accepted','delivery':'development_outbox'}
    before = len(list(c['outbox'].glob('*.json')))
    known = await client.post('/customer/v1/auth/resend-verification', json={'email':value['email']})
    unknown = await client.post('/customer/v1/auth/resend-verification', json={'email':uuid4().hex+'@example.com'})
    assert known.status_code == unknown.status_code == 202 and known.json()['data'] == unknown.json()['data']
    assert len(list(c['outbox'].glob('*.json'))) == before + 1
    assert (await client.post('/customer/v1/auth/verify-email', json={'token':old})).status_code == 400
    assert (await client.post('/customer/v1/auth/verify-email', json={'token':action_token(c,value['email'],'verify')})).status_code == 200
    await logged(c, value)
    assert (await client.post('/customer/v1/auth/login', json={k:duplicate[k] for k in ('email','password')})).status_code == 401


async def test_recovery_single_use_revoke_all_sessions_and_wrong_purpose(customers):
    c, client = customers, customers['client']
    value, headers, _ = await verified(c)
    another = await logged(c, value)
    unknown = await client.post('/customer/v1/auth/request-recovery', json={'email':uuid4().hex+'@example.com'})
    known = await client.post('/customer/v1/auth/request-recovery', json={'email':value['email']})
    assert unknown.status_code == known.status_code == 202 and unknown.json()['data'] == known.json()['data']
    token = action_token(c,value['email'],'recover')
    assert (await client.post('/customer/v1/auth/verify-email', json={'token':token})).status_code == 400
    replacement = secrets.token_urlsafe(30)
    body = {'token':token,'password':replacement,'password_confirm':replacement}
    response = await client.post('/customer/v1/auth/reset-password', json=body)
    assert response.status_code == 200 and 'access_token' not in response.text
    for auth in (headers, another):
        assert (await client.get('/customer/v1/me', headers=auth)).status_code == 401
    assert (await client.post('/customer/v1/auth/reset-password', json=body)).status_code == 400
    assert (await client.post('/customer/v1/auth/login', json={k:value[k] for k in ('email','password')})).status_code == 401
    value['password'] = replacement
    await logged(c, value)


async def test_intake_durable_idempotent_no_domain_grant_and_foreign(customers):
    c, client = customers, customers['client']
    _, a, me = await verified(c)
    _, b, other = await verified(c)
    body = intake(me)
    response = await client.post('/customer/v1/business-intakes', json=body, headers=a)
    assert response.status_code == 202, response.text
    item = response.json()['data']
    assert item['status'] == 'awaiting_evidence' and item['business_id'] is None
    repeat = await client.post('/customer/v1/business-intakes', json=body, headers=a)
    assert repeat.json()['data']['intake_id'] == item['intake_id']
    assert (await client.post('/customer/v1/business-intakes', json={**body,'description':'A changed synthetic request body for idempotency.'},headers=a)).status_code == 409
    assert (await client.get('/customer/v1/business-intakes/'+item['intake_id'], headers=b)).status_code == 404
    assert (await client.post('/customer/v1/business-intakes', json=intake(other), headers=a)).status_code == 404
    assert (await client.get('/customer/v1/business-intakes', headers=b)).json()['data']['items'] == []
    p = me['portfolios'][0]['portfolio_id']
    assert (await client.get(f'/operator/v2/portfolios/{p}/businesses', headers=a)).json()['data']['items'] == []
    await db.engine.dispose()
    assert (await client.get('/customer/v1/business-intakes/'+item['intake_id'], headers=a)).json()['data']['intake_id'] == item['intake_id']
    async with AsyncSession(c['admin']) as tx, tx.begin():
        await tx.execute(update(Membership).where(Membership.user_id == me['user_id']).values(enabled=False))
    assert (await client.get('/customer/v1/business-intakes/'+item['intake_id'], headers=a)).status_code == 404
    assert (await client.post('/customer/v1/business-intakes', json=body, headers=a)).status_code == 404


def public_material():
    project = {'slug':'synthetic-project','display_name':'Synthetic approved project','canonical_host':'example.com',
        'sector':'Test sector','relationship':'own_project','website_stage':'registered','automation_stage':'unknown',
        'public_summary':'Synthetic isolated test inventory entry.', 'public_automations':[], 'evidence_urls':[],
        'checked_at':None,'image':None}
    evidence = {'publication':{'relationship':'own_project','reference':'Explicit synthetic fixture approval only'},
                'website':None,'automations':[]}
    return project, evidence


async def draft(c, project=None, evidence=None, publish_at=None):
    default_p, default_e = public_material()
    async with AsyncSession(c['admin']) as tx, tx.begin():
        return await save(tx, environment=c['environment'], project=project or default_p, evidence=evidence or default_e,
                          publish_at=publish_at or utcnow()-timedelta(seconds=1))


async def review(c, record):
    async with AsyncSession(c['admin']) as tx, tx.begin():
        return await approve(tx,environment=c['environment'],slug=record['slug'],expected_revision=record['revision'])


async def test_public_draft_approved_exact_edit_revoke_future_and_no_private_leak(customers):
    c, client = customers, customers['client']
    assert (await client.get('/public/v1/projects')).json()['data']['items'] == []
    record = await draft(c)
    assert (await client.get('/public/v1/projects/synthetic-project')).status_code == 404
    await review(c, record)
    response = await client.get('/public/v1/projects')
    assert response.status_code == 200 and response.headers['cache-control'] == 'private, no-store'
    item = response.json()['data']['items'][0]
    assert item['publication_approved'] and item['approved_revision'] == record['revision']
    assert not {'id','environment_id','private_evidence','user_id','business_id','email','token_hash'}.intersection(item)
    assert 'Explicit synthetic fixture' not in response.text
    project, evidence = public_material()
    project['public_summary'] = 'Edited synthetic text must receive a new publication review.'
    changed = await draft(c,project,evidence)
    assert (await client.get('/public/v1/projects')).json()['data']['items'] == []
    with pytest.raises(ValueError,match='current draft'):
        await review(c,record)
    await review(c,changed)
    async with AsyncSession(c['admin']) as tx, tx.begin():
        await revoke(tx,environment=c['environment'],slug=changed['slug'])
    assert (await client.get('/public/v1/projects/synthetic-project')).status_code == 404
    future = await draft(c,project,evidence,utcnow()+timedelta(days=1))
    await review(c,future)
    assert (await client.get('/public/v1/projects')).json()['data']['items'] == []


async def test_public_verified_proof_expires_to_stale(customers):
    c, client = customers, customers['client']
    project, evidence = public_material()
    checked, expiry = utcnow()-timedelta(minutes=1), utcnow()+timedelta(minutes=1)
    project['automation_stage'] = 'verified'
    project['public_automations'] = [{'name':'Synthetic scenario','status':'verified','checked_at':checked,'expires_at':expiry}]
    record = await draft(c,project,evidence)
    with pytest.raises(ValueError,match='production proof'):
        await review(c,record)
    evidence['automations'] = [{'name':'Synthetic scenario','status':'verified','environment':'production',
        'checked_at':checked,'expires_at':expiry,'reference':'Explicit synthetic dated fixture proof','public_url':None}]
    record = await draft(c,project,evidence)
    await review(c,record)
    item = (await client.get('/public/v1/projects')).json()['data']['items'][0]
    assert item['automation_stage'] == 'verified' and item['public_automations'][0]['status'] == 'verified'
    # Advance only the projection clock; immutable approved bytes remain untouched.
    import pinet_core.public_projects.projection as module
    original = module.utcnow
    module.utcnow = lambda: expiry + timedelta(seconds=1)
    try:
        result = (await client.get('/public/v1/projects')).json()['data']['items'][0]
        assert result['automation_stage'] == result['public_automations'][0]['status'] == 'stale'
    finally:
        module.utcnow = original


async def test_default_off_local_transport_and_password_validation(customers, monkeypatch):
    client, cfg = customers['client'], settings()
    value = registration()
    monkeypatch.setattr(cfg, 'customer_enabled', False)
    assert (await client.post('/customer/v1/auth/register', json=value)).status_code == 403
    monkeypatch.setattr(cfg, 'customer_enabled', True)
    monkeypatch.setattr(cfg, 'public_projects_enabled', False)
    assert (await client.get('/public/v1/projects')).status_code == 403
    monkeypatch.setattr(cfg, 'public_projects_enabled', True)
    for headers in ({'Origin':'http://127.0.0.1:3017'}, {'Forwarded':'for=127.0.0.1'}, {'X-Forwarded-Host':'localhost'}):
        assert (await client.post('/customer/v1/auth/register', json=value,headers=headers)).status_code == 403
    for changes in ({'privacy_accepted':False}, {'password':'short','password_confirm':'short'},
                    {'password_confirm':'a different long phrase'}, {'password':'123456789012345','password_confirm':'123456789012345'},
                    {'password':'x'*257,'password_confirm':'x'*257}, {'user_id':str(uuid4())}):
        response = await client.post('/customer/v1/auth/register',json={**value,**changes})
        assert response.status_code == 400 and value['password'] not in response.text
    monkeypatch.setattr(cfg,'environment','production')
    assert (await client.post('/customer/v1/auth/register',json=value)).status_code == 403
    assert (await client.get('/public/v1/projects')).status_code == 403


async def test_expired_tokens_unverified_recovery_and_no_get_effect(customers):
    c, client = customers,customers['client']
    value, token = await registered(c)
    before = len(list(c['outbox'].glob('*.json')))
    assert (await client.post('/customer/v1/auth/request-recovery',json={'email':value['email']})).status_code == 202
    assert len(list(c['outbox'].glob('*.json'))) == before
    async with AsyncSession(c['admin']) as tx,tx.begin():
        await tx.execute(update(ActionToken).where(ActionToken.token_hash == token_hash(token)).values(expires_at=utcnow()-timedelta(seconds=1)))
    assert (await client.post('/customer/v1/auth/verify-email',json={'token':token})).status_code == 400
    assert (await client.post('/customer/v1/auth/verify-email',json={'token':secrets.token_urlsafe(32)})).status_code == 400
    assert (await client.get('/customer/v1/auth/reset-password')).status_code == 405
    async with AsyncSession(c['admin']) as tx:
        account = await tx.scalar(select(Account).where(Account.email==value['email'],Account.environment_id==c['environment']))
        assert not account.verified_at and not (await tx.get(User,account.user_id)).enabled


async def test_action_limits_durable_and_generic_floor(customers):
    client=customers['client']
    unknown={'email':uuid4().hex+'@example.com'}
    start=asyncio.get_running_loop().time()
    for _ in range(5):
        response=await client.post('/customer/v1/auth/request-recovery',json=unknown)
        assert response.status_code==202
    assert asyncio.get_running_loop().time()-start >= 2.9
    await db.engine.dispose()
    blocked=await client.post('/customer/v1/auth/request-recovery',json=unknown)
    assert blocked.status_code==429 and blocked.headers['retry-after']=='900'
    # Other actions have independent counters; validation failures cannot reset the durable bucket.
    assert (await client.post('/customer/v1/auth/resend-verification',json=unknown)).status_code==202


async def test_concurrent_signup_verify_and_recovery_login_fencing(customers):
    c, client=customers,customers['client']
    value=registration()
    results=await asyncio.gather(*(client.post('/customer/v1/auth/register',json=value) for _ in range(2)))
    assert [r.status_code for r in results]==[202,202]
    assert len(list(c['outbox'].glob('*.json')))==1
    token=action_token(c,value['email'],'verify')
    results=await asyncio.gather(*(client.post('/customer/v1/auth/verify-email',json={'token':token}) for _ in range(2)))
    assert sorted(r.status_code for r in results)==[200,400]
    await logged(c,value)
    await client.post('/customer/v1/auth/request-recovery',json={'email':value['email']})
    recovery=action_token(c,value['email'],'recover')
    newpass=secrets.token_urlsafe(30)
    reset={'token':recovery,'password':newpass,'password_confirm':newpass}
    login_body={k:value[k] for k in ('email','password')}
    old_login, changed=await asyncio.gather(client.post('/customer/v1/auth/login',json=login_body),
                                           client.post('/customer/v1/auth/reset-password',json=reset))
    assert changed.status_code==200 and old_login.status_code in {200,401}
    if old_login.status_code==200:
        old_headers={'Authorization':'Bearer '+old_login.json()['access_token']}
        assert (await client.get('/customer/v1/me',headers=old_headers)).status_code==401
    value['password']=newpass
    await logged(c,value)
    async with AsyncSession(c['admin']) as tx:
        accounts=list(await tx.scalars(select(Account).where(Account.environment_id==c['environment'])))
        assert len(accounts)==1
        assert len(list(await tx.scalars(select(Organization).where(Organization.creator_user_id==accounts[0].user_id))))==1


async def test_direct_rls_identity_token_foreign_insert_and_public_write(customers):
    c=customers
    value, headers, me=await verified(c)
    _, _, other=await verified(c)
    async with scope() as tx:
        for model in (Account,ActionToken,Intake,Project,User):
            assert not list(await tx.scalars(select(model)))
    # Runtime has no administrative public-write privilege.
    with pytest.raises(DBAPIError):
        async with scope(user=me['user_id']) as tx:
            await tx.execute(text('UPDATE control_public_projects SET revoked_at=CURRENT_TIMESTAMP'))
    # Explicit foreign row IDs, forged memberships and operator issuer are blocked by RLS.
    with pytest.raises(DBAPIError):
        async with scope(user=me['user_id']) as tx:
            tx.add(Membership(environment_id=c['environment'],user_id=me['user_id'],
                   organization_id=other['portfolios'][0]['organization_id'],role='owner',enabled=True))
            await tx.flush()
    with pytest.raises(DBAPIError):
        async with scope(user=str(uuid4())) as tx:
            tx.add(User(environment_id=c['environment'],username='forged-'+uuid4().hex,password_hash='unusable',
                        identity_issuer='local',identity_subject='forged',enabled=True))
            await tx.flush()
    async with scope(user=me['user_id']) as tx:
        assert await tx.scalar(select(Account).where(Account.user_id == other['user_id'])) is None
        assert await tx.get(User,other['user_id']) is None
        result=await tx.execute(update(User).where(User.id==other['user_id']).values(enabled=False))
        assert result.rowcount==0
    # After leaving a transaction, SET LOCAL actor does not survive pooled connection reuse.
    async with scope() as tx:
        assert not list(await tx.scalars(select(Account)))


async def test_reviewed_grant_uses_existing_registry_and_revokes_immediately(customers):
    c,client=customers,customers['client']
    _, auth, me=await verified(c)
    request=intake(me)
    response=await client.post('/customer/v1/business-intakes',json=request,headers=auth)
    assert response.status_code==202
    item=response.json()['data']
    async with AsyncSession(c['admin']) as tx,tx.begin():
        business=Business(site_id='customer-qa-'+c['environment']+'-business',canonical_host='example.com')
        tx.add(business)
        await tx.flush()
        bid=business.id
        await decide(tx,environment=c['environment'],intake_id=item['intake_id'],approve=True,
                     note='Approved only in this synthetic isolated test.',evidence_reference='Synthetic explicit ownership fixture proof',business_id=bid)
    p=me['portfolios'][0]['portfolio_id']
    path=f'/operator/v2/portfolios/{p}/businesses'
    listed=(await client.get(path,headers=auth)).json()['data']['items']
    assert [x['business_id'] for x in listed]==[bid] and listed[0]['runtime_status']=='not_connected'
    # Customer cannot use the operator-only task executor, even after a real reviewed business grant.
    assert (await client.post(f'/operator/v2/businesses/{bid}/tasks',json={'agent_id':'business-planner',
            'message':'Synthetic customer must not start an operator task.','idempotency_key':str(uuid4())},headers=auth)).status_code==403
    detail=(await client.get('/customer/v1/business-intakes/'+item['intake_id'],headers=auth)).json()['data']
    assert detail['status']=='approved' and detail['business_id']==bid and 'private_review_evidence' not in detail
    async with AsyncSession(c['admin']) as tx,tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id==bid,
                           BusinessGrant.environment_id==c['environment']).values(enabled=False))
    assert (await client.get(path,headers=auth)).json()['data']['items']==[]
    assert (await client.get('/operator/v2/businesses/'+bid,headers=auth)).status_code==404


@pytest.mark.parametrize('field,value',[
    ('canonical_host','http://example.com/path'),('canonical_host','127.0.0.1'),('canonical_host','localhost'),
    ('evidence_urls',['http://example.com/']),('evidence_urls',['https://example.com/?token=private']),
    ('image',{'src':'/assets/../private.json','alt':'Test','width':1,'height':1,'credit':None,'checked_at':utcnow()}),
    ('private_email','private@example.com'),
])
async def test_public_unsafe_fields_fail_before_publication(customers,field,value):
    project,evidence=public_material()
    project[field]=value
    with pytest.raises(ValueError):
        await draft(customers,project,evidence)
    assert (await customers['client'].get('/public/v1/projects')).json()['data']['items']==[]


async def test_outbox_unavailable_generic_and_atomic_token_rollback(customers,monkeypatch):
    c,client=customers,customers['client']
    value,token=await registered(c)
    original=Path.open
    def fail_messages(path,*args,**kwargs):
        if path.parent.resolve()==c['outbox'].resolve() and path.suffix=='.json':
            raise OSError('Synthetic private delivery error')
        return original(path,*args,**kwargs)
    monkeypatch.setattr(Path,'open',fail_messages)
    failed=await client.post('/customer/v1/auth/resend-verification',json={'email':value['email']})
    assert failed.status_code==503 and failed.json()['code']=='development_delivery_unavailable'
    # A failed write must preserve the prior token and leave no newly committed row.
    assert (await client.post('/customer/v1/auth/verify-email',json={'token':token})).status_code==200
    monkeypatch.setattr(Path,'open',original)
    headers=await logged(c,value)
    await client.post('/customer/v1/auth/request-recovery',json={'email':value['email']})
    recovery=action_token(c,value['email'],'recover')
    monkeypatch.setattr(Path,'open',fail_messages)
    replacement=secrets.token_urlsafe(30)
    failed=await client.post('/customer/v1/auth/reset-password',json={'token':recovery,'password':replacement,'password_confirm':replacement})
    assert failed.status_code==503
    assert (await client.get('/customer/v1/me',headers=headers)).status_code==200
    await logged(c,value)  # old password/session remain unchanged after failed notification commit
    def fail_probe(path,*args,**kwargs):
        if path.parent.resolve()==c['outbox'].resolve() and path.name.startswith('.probe-'):
            raise OSError('Synthetic unavailable outbox')
        return original(path,*args,**kwargs)
    monkeypatch.setattr(Path,'open',fail_probe)
    known=await client.post('/customer/v1/auth/request-recovery',json={'email':value['email']})
    unknown=await client.post('/customer/v1/auth/request-recovery',json={'email':uuid4().hex+'@example.com'})
    assert known.status_code==unknown.status_code==503 and known.json()['code']==unknown.json()['code']


async def test_public_corrupt_source_is_unavailable_not_empty(customers):
    record=await draft(customers)
    await review(customers,record)
    async with AsyncSession(customers['admin']) as tx,tx.begin():
        await tx.execute(update(Project).where(Project.environment_id==customers['environment']).values(
            public_payload={'private_unapproved_data':'Must never be serialized'}))
    response=await customers['client'].get('/public/v1/projects')
    assert response.status_code==503 and response.json()['code']=='invalid_public_source'
    assert 'private_unapproved_data' not in response.text and 'data' not in response.json()
