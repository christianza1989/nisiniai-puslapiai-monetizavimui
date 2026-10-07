import hashlib
import json
import sqlite3
import time
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from .contracts import READS, WRITES, Profile


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


class Conflict(ValueError):
    pass


class Store:
    """Transport/planning state only. One coordinator DB; not a distributed SQLite replica."""

    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.tx() as tx:
            tx.executescript("""
            CREATE TABLE IF NOT EXISTS profiles(site TEXT PRIMARY KEY, revision INTEGER, payload TEXT);
            CREATE TABLE IF NOT EXISTS jobs(
              id TEXT PRIMARY KEY, site TEXT, kind TEXT, key TEXT, state TEXT, payload TEXT,
              run_at REAL, input_hash TEXT, review_hash TEXT, policy_revision INTEGER,
              lease_owner TEXT, lease_until REAL, attempts INTEGER DEFAULT 0,
              result TEXT DEFAULT '{}', created REAL, UNIQUE(site,key));
            CREATE INDEX IF NOT EXISTS ready_jobs ON jobs(state,run_at);
            CREATE TABLE IF NOT EXISTS leases(account TEXT PRIMARY KEY, owner TEXT, expires REAL);
            CREATE TABLE IF NOT EXISTS spend(id TEXT PRIMARY KEY, site TEXT, account TEXT,
              day TEXT, month TEXT, reserved INTEGER, actual INTEGER, state TEXT,
              call_id TEXT, job_id TEXT, created REAL);
            CREATE TABLE IF NOT EXISTS records(site TEXT, kind TEXT, key TEXT, payload TEXT,
              created REAL, PRIMARY KEY(site,kind,key));
            CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,payload TEXT);
            INSERT OR IGNORE INTO settings VALUES('global_budget','{"daily":0,"monthly":0}');
            """)

    @contextmanager
    def tx(self):
        con = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("PRAGMA busy_timeout=10000")
        con.execute("BEGIN IMMEDIATE")
        try:
            yield con
            if con.in_transaction:
                con.commit()
        except BaseException:
            if con.in_transaction:
                con.rollback()
            raise
        finally:
            con.close()

    def profile(self, site, tx=None):
        if tx is None:
            with self.tx() as con:
                return self.profile(site, con)
        row = tx.execute("SELECT * FROM profiles WHERE site=?", (site,)).fetchone()
        if not row:
            raise Conflict("unknown_site")
        return {"revision": row["revision"], "profile": json.loads(row["payload"])}

    def sites(self):
        with self.tx() as tx:
            return [r["site"] for r in tx.execute("SELECT site FROM profiles ORDER BY site")]

    def update_profile(self, profile, revision, reason):
        profile = Profile.model_validate(profile).model_dump()
        site = profile["site_id"]
        with self.tx() as tx:
            row = tx.execute("SELECT revision FROM profiles WHERE site=?", (site,)).fetchone()
            if (row[0] if row else 0) != revision:
                raise Conflict("policy_revision_conflict")
            tx.execute("INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(site) DO UPDATE SET "
                       "revision=excluded.revision,payload=excluded.payload", (site, revision + 1, json.dumps(profile)))
            # Policy changes invalidate pending reviewed actions, but preserve durable receipts.
            tx.execute("UPDATE jobs SET review_hash=NULL WHERE site=? AND state='queued'", (site,))
            self.record(site, "audit", str(uuid4()), {"event": "policy_changed", "reason": reason,
                        "revision": revision + 1}, tx)
        return self.profile(site)

    def budgets(self, daily=None, monthly=None):
        with self.tx() as tx:
            if daily is not None:
                if not 0 <= daily <= monthly <= 100_000_000:
                    raise Conflict("invalid_global_budget")
                tx.execute("UPDATE settings SET payload=? WHERE key='global_budget'",
                           (json.dumps({"daily": daily, "monthly": monthly}),))
            return json.loads(tx.execute("SELECT payload FROM settings WHERE key='global_budget'").fetchone()[0])

    def record(self, site, kind, key, payload, tx=None):
        if tx is None:
            with self.tx() as con:
                return self.record(site, kind, key, payload, con)
        tx.execute("INSERT INTO records VALUES(?,?,?,?,?) ON CONFLICT(site,kind,key) DO UPDATE SET "
                   "payload=excluded.payload", (site, kind, key, json.dumps(payload), time.time()))

    def records(self, site, kind=None, limit=150):
        with self.tx() as tx:
            rows = tx.execute("SELECT * FROM records WHERE site=? AND (? IS NULL OR kind=?) "
                              "ORDER BY created DESC LIMIT ?", (site, kind, kind, limit)).fetchall()
            return [{**dict(r), "payload": json.loads(r["payload"])} for r in rows]

    def enqueue(self, site, kind, key, payload, run_at, review_hash=None):
        if kind not in WRITES | READS | {"plan", "draft", "summary", "qualify"}:
            raise Conflict("unsupported_job_kind")
        if review_hash is not None:
            raise Conflict("review_must_use_separate_revision_bound_step")
        input_hash = fingerprint({"kind": kind, "payload": payload, "run_at": run_at})
        with self.tx() as tx:
            policy = self.profile(site, tx)
            old = tx.execute("SELECT * FROM jobs WHERE site=? AND key=?", (site, key)).fetchone()
            if old:
                if old["input_hash"] != input_hash:
                    raise Conflict("job_key_conflict")
                return dict(old)
            job_id = str(uuid4())
            tx.execute("INSERT INTO jobs(id,site,kind,key,state,payload,run_at,input_hash,review_hash,"
                       "policy_revision,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                       (job_id, site, kind, key, "queued", json.dumps(payload), run_at, input_hash,
                        review_hash, policy["revision"], time.time()))
            return {"id": job_id, "state": "queued"}

    def jobs(self, site):
        with self.tx() as tx:
            return [self.job_view(r) for r in tx.execute("SELECT * FROM jobs WHERE site=? "
                                                       "ORDER BY run_at DESC LIMIT 200", (site,))]

    @staticmethod
    def job_view(row):
        return {**dict(row), "payload": json.loads(row["payload"]), "result": json.loads(row["result"])}

    def review(self, site, job_id, expected_hash, approved, reason):
        with self.tx() as tx:
            row = tx.execute("SELECT * FROM jobs WHERE site=? AND id=?", (site, job_id)).fetchone()
            if not row or row["state"] != "queued" or row["input_hash"] != expected_hash:
                raise Conflict("stale_job_review")
            revision = self.profile(site, tx)["revision"]
            tx.execute("UPDATE jobs SET review_hash=?,policy_revision=?,state=? WHERE id=?",
                       (expected_hash if approved else None, revision, "queued" if approved else "rejected", job_id))
            self.record(site, "audit", str(uuid4()), {"event": "operator_review", "job": job_id,
                        "input_hash": expected_hash, "approved": approved, "reason": reason}, tx)

    def cancel(self, site, job_id):
        with self.tx() as tx:
            result = tx.execute("UPDATE jobs SET state='cancelled' WHERE site=? AND id=? AND state='queued'",
                                (site, job_id))
            if result.rowcount != 1:
                raise Conflict("job_not_cancellable")

    def claim(self, site, owner, now=None):
        now = now or time.time()
        with self.tx() as tx:
            profile = self.profile(site, tx)["profile"]
            if not profile["enabled"] or profile["paused"]:
                return None
            tx.execute("UPDATE jobs SET state=CASE WHEN kind IN ('post','thread','reply','dm') "
                       "THEN 'uncertain' ELSE 'blocked' END,result=? WHERE state='running' AND lease_until<?",
                       (json.dumps({"reason": "expired_lease_no_blind_retry"}), now))
            row = tx.execute("SELECT * FROM jobs WHERE site=? AND state='queued' AND run_at<=? "
                             "ORDER BY run_at LIMIT 1", (site, now)).fetchone()
            if not row:
                return None
            midnight = datetime.fromtimestamp(now, UTC).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
            used = tx.execute("SELECT COUNT(*) FROM jobs WHERE site=? AND attempts>0 AND lease_until>=?",
                              (site, midnight)).fetchone()[0]
            if used >= profile["max_jobs_per_day"]:
                return None
            account = profile["actor_id"] or f"local:{site}"
            lease = tx.execute("SELECT * FROM leases WHERE account=?", (account,)).fetchone()
            if lease and lease["expires"] > now:
                return None
            tx.execute("INSERT INTO leases VALUES(?,?,?) ON CONFLICT(account) DO UPDATE SET "
                       "owner=excluded.owner,expires=excluded.expires", (account, owner, now + 480))
            tx.execute("UPDATE jobs SET state='running',lease_owner=?,lease_until=?,attempts=attempts+1 WHERE id=?",
                       (owner, now + 480, row["id"]))
            return {**self.job_view(row), "lease_owner": owner, "account": account}

    def finish(self, job, state, result):
        with self.tx() as tx:
            row = tx.execute("SELECT state,lease_owner FROM jobs WHERE id=?", (job["id"],)).fetchone()
            if not row or row["state"] != "running" or row["lease_owner"] != job["lease_owner"]:
                raise Conflict("lost_job_lease")
            tx.execute("UPDATE jobs SET state=?,result=? WHERE id=?", (state, json.dumps(result), job["id"]))
            tx.execute("DELETE FROM leases WHERE account=? AND owner=?", (job["account"], job["lease_owner"]))

    def reserve(self, site, account, amount, job_id, now=None, operation=None, job=None):
        now = datetime.fromtimestamp(now or time.time(), UTC)
        day, month = now.strftime("%Y-%m-%d"), now.strftime("%Y-%m")
        with self.tx() as tx:
            p = self.profile(site, tx)["profile"]
            if not p["enabled"] or p["paused"]:
                raise Conflict("module_disabled_or_paused")
            if job:
                actual = tx.execute("SELECT * FROM jobs WHERE site=? AND id=?", (site, job["id"])).fetchone()
                if not actual or actual["state"] != "running" or actual["lease_owner"] != job["lease_owner"]:
                    raise Conflict("lost_job_lease")
                if self.profile(site, tx)["revision"] != job["policy_revision"]:
                    raise Conflict("dispatch_policy_changed")
                if operation in WRITES and actual["review_hash"] != actual["input_hash"]:
                    raise Conflict("current_revision_review_required")
            if operation:
                mode = "live_write" if operation in WRITES | {"media_upload", "media_alt"} else "live_read"
                if not p[mode]:
                    raise Conflict("live_action_disabled")
                quota_kind = "write" if operation in WRITES else "read" if operation in READS else "other"
                rows = tx.execute("SELECT payload FROM records WHERE site=? AND kind='dispatch' AND date(created,'unixepoch')=?",
                                  (site, day)).fetchall()
                count = sum(json.loads(r[0])["quota"] == quota_kind for r in rows)
                cap = p["max_posts_per_day"] if quota_kind == "write" else p["max_reads_per_day"] if quota_kind == "read" else 12
                if count >= cap:
                    raise Conflict("daily_action_quota_exhausted")
                if operation in {"reply", "dm"}:
                    interaction = job["payload"]["interaction_id"]
                    if tx.execute("SELECT 1 FROM records WHERE site=? AND kind=?", (site, "answered:" + interaction)).fetchone():
                        raise Conflict("interaction_already_answered")
                    self.record(site, "answered:" + interaction, job_id, {"state": "dispatch_reserved"}, tx)
            global_budget = json.loads(tx.execute("SELECT payload FROM settings WHERE key='global_budget'").fetchone()[0])
            for period, stamp, cap, global_cap in [("day", day, p["daily_cap_micro"], global_budget["daily"]),
                                                  ("month", month, p["monthly_cap_micro"], global_budget["monthly"])]:
                # Unknown outcomes hold the full reservation. Overruns remain visible and block further calls.
                query = f"SELECT COALESCE(SUM(MAX(reserved,COALESCE(actual,0))),0) FROM spend WHERE {period}=?"
                used = tx.execute(query + " AND site=? AND state!='released'", (stamp, site)).fetchone()[0]
                all_used = tx.execute(query + " AND state!='released'", (stamp,)).fetchone()[0]
                if amount <= 0 or used + amount > cap or all_used + amount > global_cap:
                    raise Conflict("budget_exhausted_or_unconfigured")
            key = str(uuid4())
            tx.execute("INSERT INTO spend VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                       (key, site, account, day, month, amount, None, "reserved", None, job_id, time.time()))
            if operation:
                self.record(site, "dispatch", key, {"operation": operation, "job_id": job_id, "quota": quota_kind}, tx)
            return key

    def acquire_account(self, site, owner):
        with self.tx() as tx:
            account = self.profile(site, tx)["profile"]["actor_id"] or "treg-x"
            now = time.time()
            row = tx.execute("SELECT expires FROM leases WHERE account=?", (account,)).fetchone()
            if row and row[0] > now:
                raise Conflict("account_busy")
            tx.execute("INSERT INTO leases VALUES(?,?,?) ON CONFLICT(account) DO UPDATE SET owner=excluded.owner,expires=excluded.expires",
                       (account, owner, now + 480))
            return account

    def release_account(self, account, owner):
        with self.tx() as tx:
            tx.execute("DELETE FROM leases WHERE account=? AND owner=?", (account, owner))

    def settle(self, reservation, actual, call_id, failed_before_provider=False):
        with self.tx() as tx:
            state = "released" if failed_before_provider else "settled" if actual is not None else "unknown"
            tx.execute("UPDATE spend SET actual=?,call_id=?,state=?,reserved=CASE WHEN ?='settled' "
                       "THEN ? ELSE reserved END WHERE id=? AND state='reserved'",
                       (actual, call_id, state, state, actual, reservation))

    def spending(self, site):
        with self.tx() as tx:
            return [dict(r) for r in tx.execute("SELECT * FROM spend WHERE site=? ORDER BY created DESC LIMIT 200", (site,))]

    def totals(self, site):
        with self.tx() as tx:
            actual = tx.execute("SELECT COALESCE(SUM(actual),0) FROM spend WHERE site=?", (site,)).fetchone()[0]
            unknown = tx.execute("SELECT COUNT(*) FROM spend WHERE site=? AND state IN ('reserved','unknown')", (site,)).fetchone()[0]
            counts = dict(tx.execute("SELECT kind,COUNT(*) FROM records WHERE site=? GROUP BY kind", (site,)).fetchall())
            return {"actual_micro": actual, "unknown_receipts": unknown, "published": counts.get("published", 0),
                    "signals": counts.get("signal", 0)}

    def counts(self, site, now=None):
        day = datetime.fromtimestamp(now or time.time(), UTC).strftime("%Y-%m-%d")
        with self.tx() as tx:
            rows = tx.execute("SELECT kind,COUNT(*) AS n FROM jobs WHERE site=? "
                              "AND date(created,'unixepoch')=? GROUP BY kind", (site, day)).fetchall()
            return {r["kind"]: r["n"] for r in rows}

    def credential_hash(self, token):
        return hashlib.sha256(token.encode()).hexdigest()
