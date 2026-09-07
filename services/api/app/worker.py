"""arq worker: cron jobs only in this phase (no on-demand jobs enqueued yet).

Run with: arq app.worker.WorkerSettings
See .claude/rules/api.md -- scheduler is arq on Redis, no Celery.

Every job is defensive: it wraps its DB work in try/except and logs +
returns rather than raising, so it no-ops safely when the database is empty
or unreachable (e.g. a fresh dev environment before any migration has run).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import select

from app.config import settings
from app.db import async_session_maker
from app.models import Attempt

logger = logging.getLogger("app.worker")
logging.basicConfig(level=logging.INFO)


async def auto_submit_expired_attempts(ctx: dict) -> None:
    """Every minute: submit any attempt whose ends_at has passed but that is
    still in_progress (the client missed the client-side auto-submit)."""
    now = datetime.now(UTC)
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(Attempt).where(Attempt.status == "in_progress", Attempt.ends_at <= now)
            )
            expired = result.scalars().all()
            if not expired:
                logger.info("auto_submit_expired_attempts: nothing to do")
                return
            for attempt in expired:
                attempt.status = "auto_submitted"
                attempt.submitted_at = now
            await session.commit()
            logger.info("auto_submit_expired_attempts: auto-submitted %d attempt(s)", len(expired))
    except Exception:  # noqa: BLE001 - defensive: DB may not exist yet
        logger.exception("auto_submit_expired_attempts: skipped (DB unavailable or empty)")


async def recompute_leaderboard(ctx: dict) -> None:
    """Nightly at 02:00 IST: recompute per-test rank for all results.

    Placeholder implementation -- logs and no-ops if there are no results
    yet. A later phase will write ranks back onto app.models.Result rows.
    """
    try:
        from app.models import Result

        async with async_session_maker() as session:
            result = await session.execute(select(Result))
            rows = result.scalars().all()
            if not rows:
                logger.info("recompute_leaderboard: nothing to do")
                return
            logger.info(
                "recompute_leaderboard: %d result row(s) found (rank recompute TODO)", len(rows)
            )
    except Exception:  # noqa: BLE001 - defensive: DB may not exist yet
        logger.exception("recompute_leaderboard: skipped (DB unavailable or empty)")


# 02:00 IST == 20:30 UTC (IST is UTC+5:30, so 02:00 IST the same calendar
# day is 20:30 UTC the previous day).
class WorkerSettings:
    functions = [auto_submit_expired_attempts, recompute_leaderboard]
    cron_jobs = [
        cron(auto_submit_expired_attempts, minute=set(range(60)), run_at_startup=False),
        cron(recompute_leaderboard, hour={20}, minute={30}, run_at_startup=False),
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
