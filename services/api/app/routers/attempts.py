import secrets
from copy import deepcopy
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app import catalog, practice
from app.db import get_session
from app.models import PracticeAttempt
from app.schemas import (
    AnswerPatchIn,
    AttemptCreateIn,
    AttemptOut,
    OkOut,
    PaperQuestionOut,
    SubmitIn,
    SubmitOut,
    TestMetaOut,
)

router = APIRouter(prefix="/v1/attempts", tags=["attempts"])


@router.post("", response_model=AttemptOut)
async def create_attempt(body: AttemptCreateIn, session: AsyncSession = Depends(get_session)):
    entry = catalog.get_entry(body.test_id)
    if not entry["meta"]["free"]:
        raise HTTPException(403, "Test is locked")
    started = datetime.now(UTC)
    attempt = PracticeAttempt(
        id=secrets.token_urlsafe(32),
        test_id=body.test_id,
        started_at=started,
        ends_at=started + timedelta(minutes=entry["meta"]["pattern"]["durationMinutes"]),
        status="in_progress",
        snapshot=deepcopy(entry),
        answers={},
    )
    session.add(attempt)
    await session.commit()
    return AttemptOut.model_validate(attempt, from_attributes=True)


@router.get("/{attempt_id}", response_model=AttemptOut)
async def get_attempt(attempt_id: str, session: AsyncSession = Depends(get_session)):
    return AttemptOut.model_validate(await practice.load(session, attempt_id), from_attributes=True)


@router.get(
    "/{attempt_id}/paper", response_model=list[PaperQuestionOut], response_model_exclude_none=True
)
async def get_attempt_paper(attempt_id: str, session: AsyncSession = Depends(get_session)):
    attempt = await practice.load(session, attempt_id)
    return catalog.public_paper(attempt.snapshot)


@router.get("/{attempt_id}/meta", response_model=TestMetaOut, response_model_exclude_none=True)
async def get_attempt_meta(attempt_id: str, session: AsyncSession = Depends(get_session)):
    return (await practice.load(session, attempt_id)).snapshot["meta"]


@router.patch("/{attempt_id}/answers", response_model=OkOut)
async def patch_answer(
    attempt_id: str, body: AnswerPatchIn, session: AsyncSession = Depends(get_session)
):
    attempt = await practice.load(session, attempt_id, lock=True)
    if attempt.status != "in_progress" or datetime.now(UTC) >= practice.utc(attempt.ends_at):
        raise HTTPException(409, "Attempt is closed; submit the final practice snapshot")
    attempt.answers = {**attempt.answers, **practice.validate_answers(attempt, [body])}
    await session.commit()
    return OkOut()


@router.post("/{attempt_id}/submit", response_model=SubmitOut)
async def submit_attempt(
    attempt_id: str, body: SubmitIn | None = None, session: AsyncSession = Depends(get_session)
):
    attempt = await practice.load(session, attempt_id, lock=True)
    if attempt.result is None:
        if body is not None and body.answers is not None:
            attempt.answers = practice.validate_answers(attempt, body.answers)
        attempt.result = practice.mark(attempt, body.elapsed_seconds if body else None)
        attempt.status = (
            "auto_submitted" if datetime.now(UTC) >= practice.utc(attempt.ends_at) else "submitted"
        )
        await session.commit()
    return SubmitOut(result_id=attempt.id)
