from fastapi import APIRouter, HTTPException, status

from app import fixtures
from app.schemas import TestDetail, TestSummary

router = APIRouter(prefix="/v1/tests", tags=["tests"])


@router.get("", response_model=list[TestSummary])
async def list_tests() -> list[TestSummary]:
    return [TestSummary(**fixtures.test_summary(t)) for t in fixtures.TESTS_BY_ID.values()]


@router.get("/{test_id}", response_model=TestDetail)
async def get_test(test_id: str) -> TestDetail:
    test = fixtures.TESTS_BY_ID.get(test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")
    return TestDetail(**fixtures.test_detail(test))
