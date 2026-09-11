from fastapi import APIRouter, Depends, HTTPException, status

from app import fixtures
from app.routers.auth import require_user
from app.schemas import ResultDetailOut, ResultOut, ReviewQuestionOut

router = APIRouter(prefix="/v1/results", tags=["results"])


@router.get("/{result_id}", response_model=ResultOut)
async def get_result(result_id: str, user: dict = Depends(require_user)) -> ResultOut:
    result = _owned_result(result_id, user)
    return ResultOut(**result)


def _owned_result(result_id: str, user: dict) -> dict:
    result = fixtures.RESULTS.get(result_id)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Result not found")
    # The repository's pre-existing canned demo has no candidate. Keep it available to a
    # signed-in reviewer; every result produced by submission remains strictly owner-only.
    if result_id == fixtures.SAMPLE_RESULT_ID:
        return result
    if result.get("user_id") != user["id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Result not found")
    return result


@router.get("/{result_id}/detail", response_model=ResultDetailOut)
async def get_detail(
    result_id: str, user: dict = Depends(require_user)
) -> ResultDetailOut:
    _owned_result(result_id, user)
    return ResultDetailOut(**fixtures.get_result_detail(result_id))


@router.get("/{result_id}/paper", response_model=list[ReviewQuestionOut])
async def get_review_paper(
    result_id: str, user: dict = Depends(require_user)
) -> list[ReviewQuestionOut]:
    _owned_result(result_id, user)
    paper = fixtures.get_review_paper(result_id)
    return [ReviewQuestionOut(**question) for question in paper or []]
