from fastapi import APIRouter

from app import catalog
from app.schemas import PaperQuestionOut, TestDetail, TestMetaOut, TestSummary

router = APIRouter(prefix="/v1/tests", tags=["tests"])


@router.get("", response_model=list[TestSummary])
async def list_tests():
    return [catalog.summary(entry) for entry in catalog.CATALOG.values()]


@router.get("/catalog", response_model=list[TestMetaOut], response_model_exclude_none=True)
async def list_catalog():
    return [entry["meta"] for entry in catalog.CATALOG.values()]


@router.get("/{test_id}/meta", response_model=TestMetaOut, response_model_exclude_none=True)
async def get_meta(test_id: str):
    return catalog.get_entry(test_id)["meta"]


@router.get(
    "/{test_id}/paper", response_model=list[PaperQuestionOut], response_model_exclude_none=True
)
async def get_paper(test_id: str):
    return catalog.public_paper(catalog.get_entry(test_id))


@router.get("/{test_id}", response_model=TestDetail)
async def get_test(test_id: str):
    return catalog.detail(catalog.get_entry(test_id))
