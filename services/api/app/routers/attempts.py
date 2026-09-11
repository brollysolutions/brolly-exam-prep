from fastapi import APIRouter, Depends, HTTPException, status

from app import fixtures
from app.routers.auth import require_user
from app.schemas import (
    AnswerPatchIn,
    AttemptCreateIn,
    AttemptDetailOut,
    AttemptOut,
    OkOut,
    PaperQuestionOut,
    SubmitOut,
    TestMetaOut,
)

router = APIRouter(prefix="/v1/attempts", tags=["attempts"])


@router.post("", response_model=AttemptOut)
async def create_attempt(body: AttemptCreateIn, user: dict = Depends(require_user)) -> AttemptOut:
    attempt = fixtures.create_attempt(body.test_id, user["id"], body.client_attempt_id)
    if attempt is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")
    return AttemptOut(**attempt)


@router.patch("/{attempt_id}/answers", response_model=OkOut)
async def patch_answer(
    attempt_id: str, body: AnswerPatchIn, user: dict = Depends(require_user)
) -> OkOut:
    attempt = fixtures.ATTEMPTS.get(attempt_id)
    if attempt is None or attempt.get("user_id") != user["id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    ok = fixtures.patch_answer(attempt_id, body.question_id, body.choice, body.marked)
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot record answer for this attempt")
    return OkOut()


@router.post("/{attempt_id}/submit", response_model=SubmitOut)
async def submit_attempt(attempt_id: str, user: dict = Depends(require_user)) -> SubmitOut:
    attempt = fixtures.ATTEMPTS.get(attempt_id)
    if attempt is None or attempt.get("user_id") != user["id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    result = fixtures.submit_attempt(attempt_id)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    return SubmitOut(result_id=result["id"])


def _owned_attempt(attempt_id: str, user: dict) -> dict:
    attempt = fixtures.ATTEMPTS.get(attempt_id)
    if attempt is None or attempt.get("user_id") != user["id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    return attempt


@router.get("/{attempt_id}", response_model=AttemptDetailOut)
async def get_attempt(
    attempt_id: str, user: dict = Depends(require_user)
) -> AttemptDetailOut:
    _owned_attempt(attempt_id, user)
    return AttemptDetailOut(**fixtures.get_attempt_detail(attempt_id))


@router.get("/{attempt_id}/paper", response_model=list[PaperQuestionOut])
async def get_attempt_paper(
    attempt_id: str, user: dict = Depends(require_user)
) -> list[PaperQuestionOut]:
    attempt = _owned_attempt(attempt_id, user)
    paper = fixtures.get_public_paper(attempt["test_id"])
    return [PaperQuestionOut(**question) for question in paper or []]


@router.get("/{attempt_id}/meta", response_model=TestMetaOut)
async def get_attempt_meta(
    attempt_id: str, user: dict = Depends(require_user)
) -> TestMetaOut:
    attempt = _owned_attempt(attempt_id, user)
    return TestMetaOut(**fixtures.get_test_meta(attempt["test_id"]))
