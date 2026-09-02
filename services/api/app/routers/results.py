from fastapi import APIRouter, HTTPException, status

from app import fixtures
from app.schemas import ResultOut

router = APIRouter(prefix="/v1/results", tags=["results"])


@router.get("/{result_id}", response_model=ResultOut)
async def get_result(result_id: str) -> ResultOut:
    result = fixtures.RESULTS.get(result_id)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Result not found")
    return ResultOut(**result)
