import asyncio
import hashlib
import json
import secrets
from datetime import timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import select, text, update

from ..config import settings
from ..control.models import Membership, Organization, Portfolio, Session, User
from ..control.routes import ControlError, SafeRoute, authenticated, identifier, token_hash
from ..control.routes import envelope as core_envelope
from ..models import new_id, utcnow
from .models import Account, ActionToken, Intake
from .service import (
    DUMMY,
    actor,
    admit,
    consume_context,
    customer_guard,
    customer_scope,
    email_hash,
    generic_floor,
    hash_password,
    host,
    issue,
    lock_account,
    matches,
    outbox,
    validate_password,
)

router = APIRouter(prefix="/customer/v1", route_class=SafeRoute, dependencies=[Depends(customer_guard)])


def envelope(request, data):
    result = core_envelope(request, data)
    result["contract_version"] = "customer.v1"
    return result


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Email(Input):
    email: EmailStr = Field(max_length=254)

    @field_validator("email")
    @classmethod
    def normalized(cls, value):
        return value.lower()


class Password(Input):
    password: str = Field(min_length=15, max_length=256)
    password_confirm: str = Field(min_length=15, max_length=256)


class Register(Email, Password):
    display_name: str = Field(min_length=1, max_length=100)
    privacy_accepted: Literal[True]

    @field_validator("privacy_accepted", mode="before")
    @classmethod
    def actual_consent(cls, value):
        if value is not True:
            raise ValueError()
        return value

    @field_validator("display_name")
    @classmethod
    def clean_name(cls, value):
        if not value.strip() or any(ord(c) < 32 for c in value):
            raise ValueError()
        return value.strip()


class Login(Email):
    password: str = Field(min_length=1, max_length=256)


class Token(Input):
    token: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$")


class Reset(Token, Password):
    pass


class IntakeInput(Input):
    portfolio_id: UUID
    kind: Literal["claim", "create"]
    display_name: str = Field(min_length=1, max_length=100)
    canonical_host: str | None = Field(max_length=253)
    description: str = Field(min_length=20, max_length=1500)
    idempotency_key: UUID

    @field_validator("canonical_host")
    @classmethod
    def normalized_host(cls, value):
        return host(value) if value is not None else None

    @field_validator("display_name", "description")
    @classmethod
    def clean_text(cls, value):
        if not value.strip() or any(ord(c) < 32 and c not in "\n\t" for c in value):
            raise ValueError()
        return value.strip()

    @field_validator("description")
    @classmethod
    def substantive_description(cls, value):
        if len(value) < 20:
            raise ValueError()
        return value


@router.post("/auth/register", status_code=202)
async def register(value: Register, request: Request):
    start = asyncio.get_running_loop().time()
    validate_password(value.password, value.password_confirm)
    await admit("register", request, value.email)
    encoded = await asyncio.to_thread(hash_password, value.password)
    digest = email_hash(value.email)
    async with customer_scope(email=digest) as tx:
        # Serialize simultaneous normalized-address signups without changing an existing account.
        await tx.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": int(digest[:16], 16) - 2**63})
        if not await tx.scalar(select(Account).where(Account.email_hash == digest)):
            uid = new_id()
            await actor(tx, uid)
            tx.add(User(id=uid, environment_id=settings().environment, username="customer-" + UUID(uid).hex,
                        password_hash=encoded, identity_issuer="pinet-customer", identity_subject=uid, enabled=False))
            await tx.flush()
            account = Account(user_id=uid, environment_id=settings().environment, email=value.email,
                              email_hash=digest, display_name=value.display_name, privacy_accepted_at=utcnow())
            tx.add(account)
            await tx.flush()
            await issue(tx, account, "verify")
    await generic_floor(start)
    return envelope(request, {"status": "accepted", "delivery": "development_outbox"})


async def send_link(value, request, purpose):
    start = asyncio.get_running_loop().time()
    await admit("resend" if purpose == "verify" else "recover", request, value.email)
    async with customer_scope(email=email_hash(value.email)) as tx:
        account = await tx.scalar(select(Account).where(Account.email_hash == email_hash(value.email)))
        if account:
            user = await lock_account(tx, account)
            await tx.refresh(account)
            eligible = not account.verified_at if purpose == "verify" else account.verified_at and user.enabled
            if user and user.identity_issuer == "pinet-customer" and eligible:
                await issue(tx, account, purpose)
    await generic_floor(start)
    return envelope(request, {"status": "accepted", "delivery": "development_outbox"})


@router.post("/auth/resend-verification", status_code=202)
async def resend(value: Email, request: Request):
    return await send_link(value, request, "verify")


@router.post("/auth/request-recovery", status_code=202)
async def recover(value: Email, request: Request):
    return await send_link(value, request, "recover")


@router.post("/auth/verify-email")
async def verify(value: Token, request: Request):
    await admit("verify", request)
    async with customer_scope(token=token_hash(value.token)) as tx:
        user, account, _ = await consume_context(tx, value.token, "verify")
        if account.verified_at:
            raise ControlError(400, "invalid_token")
        now = utcnow()
        account.verified_at, user.enabled = now, True
        await tx.flush()
        organization = Organization(environment_id=settings().environment, key="customer-" + UUID(user.id).hex,
                                    display_name=account.display_name, creator_user_id=user.id)
        tx.add(organization)
        await tx.flush()
        tx.add(Membership(environment_id=settings().environment, user_id=user.id,
                          organization_id=organization.id, role="owner", enabled=True))
        await tx.flush()
        tx.add(Portfolio(environment_id=settings().environment, organization_id=organization.id,
                         display_name=account.display_name))
        await tx.execute(update(ActionToken).where(ActionToken.user_id == user.id, ActionToken.purpose == "verify",
                         ActionToken.consumed_at.is_(None)).values(consumed_at=now))
    return envelope(request, {"status": "verified", "next_action": "login"})


@router.post("/auth/login")
async def login(value: Login, request: Request):
    await admit("login", request, value.email)
    async with customer_scope(email=email_hash(value.email)) as tx:
        account = await tx.scalar(select(Account).where(Account.email_hash == email_hash(value.email)))
        user = None
        if account:
            await actor(tx, account.user_id)
            user = await tx.scalar(select(User).where(User.id == account.user_id).with_for_update(read=True))
        valid = await asyncio.to_thread(matches, value.password, user.password_hash if user else DUMMY)
        if not valid or not user or not user.enabled or not account.verified_at or user.identity_issuer != "pinet-customer":
            raise ControlError(401, "invalid_credentials")
        token = secrets.token_urlsafe(48)
        expires = utcnow() + timedelta(seconds=settings().control_session_seconds)
        tx.add(Session(environment_id=settings().environment, user_id=user.id, token_hash=token_hash(token), expires_at=expires))
    return {"access_token": token, "token_type": "Bearer", "expires_at": expires.isoformat()}


@router.post("/auth/reset-password")
async def reset(value: Reset, request: Request):
    validate_password(value.password, value.password_confirm)
    await admit("reset", request)
    encoded = await asyncio.to_thread(hash_password, value.password)
    async with customer_scope(token=token_hash(value.token)) as tx:
        user, account, _ = await consume_context(tx, value.token, "recover")
        if not user.enabled or not account.verified_at:
            raise ControlError(400, "invalid_token")
        now = utcnow()
        user.password_hash = encoded
        await tx.execute(update(Session).where(Session.user_id == user.id, Session.revoked_at.is_(None)).values(revoked_at=now))
        await tx.execute(update(ActionToken).where(ActionToken.user_id == user.id, ActionToken.consumed_at.is_(None)).values(consumed_at=now))
        outbox(tx, account, "password_changed")
    return envelope(request, {"status": "password_reset", "next_action": "login"})


async def own_account(context):
    tx, session = context
    account = await tx.scalar(select(Account).where(Account.user_id == session.user_id))
    if not account or not account.verified_at:
        raise ControlError(404, "not_found")
    return account


@router.get("/me")
async def me(request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    account = await own_account(context)
    portfolios = list(await tx.scalars(select(Portfolio).join(Membership, Membership.organization_id == Portfolio.organization_id)
                 .where(Membership.user_id == session.user_id, Membership.enabled, Membership.role == "owner").order_by(Portfolio.id)))
    return envelope(request, {"user_id": session.user_id, "email": account.email, "display_name": account.display_name,
        "email_verified": True, "portfolios": [{"organization_id": p.organization_id, "portfolio_id": p.id,
        "display_name": p.display_name} for p in portfolios],
        "capabilities": ["portfolio.read", "business_intake.create"] if portfolios else []})


def intake_view(item):
    return {"intake_id": item.id, "portfolio_id": item.portfolio_id, "kind": item.kind,
            "display_name": item.display_name, "canonical_host": item.canonical_host, "description": item.description,
            "status": item.status, "business_id": item.business_id, "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(), "decision_note": item.decision_note}


@router.post("/business-intakes", status_code=202)
async def create_intake(value: IntakeInput, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    await own_account(context)
    await admit("intake", request)
    if value.kind == "claim" and value.canonical_host is None:
        raise ControlError(400, "invalid_request")
    portfolio = await tx.get(Portfolio, str(value.portfolio_id))
    if not portfolio or not await tx.scalar(select(Membership).where(Membership.organization_id == portfolio.organization_id,
                 Membership.user_id == session.user_id, Membership.enabled, Membership.role == "owner")):
        raise ControlError(404, "not_found")
    payload = value.model_dump(mode="json")
    fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    # Final write admission under current locks, including reset/session/member revocation.
    user = await tx.scalar(select(User).where(User.id == session.user_id).with_for_update())
    await tx.refresh(session, with_for_update={"read": True})
    if not user.enabled or session.revoked_at or session.expires_at <= utcnow():
        raise ControlError(401, "unauthenticated")
    member = await tx.scalar(select(Membership).where(Membership.organization_id == portfolio.organization_id,
                   Membership.user_id == session.user_id, Membership.enabled, Membership.role == "owner"))
    if not member:
        raise ControlError(404, "not_found")
    existing = await tx.scalar(select(Intake).where(Intake.user_id == session.user_id,
                      Intake.idempotency_key == str(value.idempotency_key)))
    if existing:
        if existing.fingerprint != fingerprint:
            raise ControlError(409, "idempotency_conflict")
        return envelope(request, intake_view(existing))
    item = Intake(environment_id=settings().environment, user_id=session.user_id, organization_id=portfolio.organization_id,
        portfolio_id=portfolio.id, kind=value.kind, display_name=value.display_name, canonical_host=value.canonical_host,
        description=value.description, idempotency_key=str(value.idempotency_key), fingerprint=fingerprint,
        status="awaiting_evidence" if value.kind == "claim" else "awaiting_review")
    tx.add(item)
    await tx.flush()
    return envelope(request, intake_view(item))


@router.get("/business-intakes")
async def list_intakes(request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    await own_account(context)
    items = await tx.scalars(select(Intake).where(Intake.user_id == session.user_id).order_by(Intake.created_at.desc(), Intake.id).limit(100))
    return envelope(request, {"items": [intake_view(i) for i in items]})


@router.get("/business-intakes/{intake_id}")
async def detail_intake(intake_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, _ = context
    await own_account(context)
    item = await tx.get(Intake, identifier(intake_id))
    if not item:
        raise ControlError(404, "not_found")
    return envelope(request, intake_view(item))
