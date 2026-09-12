from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.practice import load
from app.schemas import ResultDetailOut, ResultOut, ReviewPaperQuestionOut

router = APIRouter(prefix="/v1/results", tags=["results"])


async def submitted(result_id: str, session: AsyncSession):
    attempt = await load(session, result_id)
    if attempt.result is None:
        raise HTTPException(409, "Submit the attempt before opening results")
    return attempt


@router.get("/{result_id}", response_model=ResultOut)
async def get_result(result_id: str, session: AsyncSession = Depends(get_session)):
    return (await submitted(result_id, session)).result["summary"]


@router.get("/{result_id}/detail", response_model=ResultDetailOut)
async def get_detail(result_id: str, session: AsyncSession = Depends(get_session)):
    return (await submitted(result_id, session)).result["detail"]


@router.get("/{result_id}/paper", response_model=list[ReviewPaperQuestionOut])
async def get_review_paper(result_id: str, session: AsyncSession = Depends(get_session)):
    return (await submitted(result_id, session)).snapshot["paper"]
