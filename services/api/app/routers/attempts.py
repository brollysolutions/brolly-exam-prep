from fastapi import APIRouter, HTTPException, status

from app import fixtures
from app.schemas import AnswerPatchIn, AttemptCreateIn, AttemptOut, OkOut, SubmitOut

router = APIRouter(prefix="/v1/attempts", tags=["attempts"])


@router.post("", response_model=AttemptOut)
async def create_attempt(body: AttemptCreateIn) -> AttemptOut:
    attempt = fixtures.create_attempt(body.test_id)
    if attempt is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")
    return AttemptOut(**attempt)


@router.patch("/{attempt_id}/answers", response_model=OkOut)
async def patch_answer(attempt_id: str, body: AnswerPatchIn) -> OkOut:
    if attempt_id not in fixtures.ATTEMPTS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    ok = fixtures.patch_answer(attempt_id, body.question_id, body.choice, body.marked)
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot record answer for this attempt")
    return OkOut()


@router.post("/{attempt_id}/submit", response_model=SubmitOut)
async def submit_attempt(attempt_id: str) -> SubmitOut:
    if attempt_id not in fixtures.ATTEMPTS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    result = fixtures.submit_attempt(attempt_id)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    return SubmitOut(result_id=result["id"])
