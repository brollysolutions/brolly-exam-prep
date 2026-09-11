from fastapi import APIRouter, HTTPException, status

from app import fixtures
from app.schemas import PaperQuestionOut, TestDetail, TestMetaOut, TestSummary

router = APIRouter(prefix="/v1/tests", tags=["tests"])


@router.get("", response_model=list[TestSummary])
async def list_tests() -> list[TestSummary]:
    return [TestSummary(**fixtures.test_summary(t)) for t in fixtures.TESTS_BY_ID.values()]


@router.get("/catalog", response_model=list[TestMetaOut])
async def list_catalog() -> list[TestMetaOut]:
    return [TestMetaOut(**fixtures.get_test_meta(test_id)) for test_id in fixtures.TESTS_BY_ID]


@router.get("/{test_id}", response_model=TestDetail)
async def get_test(test_id: str) -> TestDetail:
    test = fixtures.TESTS_BY_ID.get(test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")
    return TestDetail(**fixtures.test_detail(test))


@router.get("/{test_id}/meta", response_model=TestMetaOut)
async def get_meta(test_id: str) -> TestMetaOut:
    meta = fixtures.get_test_meta(test_id)
    if meta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")
    return TestMetaOut(**meta)


@router.get("/{test_id}/paper", response_model=list[PaperQuestionOut])
async def get_paper(test_id: str) -> list[PaperQuestionOut]:
    paper = fixtures.get_public_paper(test_id)
    if paper is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")
    return [PaperQuestionOut(**question) for question in paper]
