from fastapi import APIRouter

from app.content import get_content
from app.schemas import ContentOut

router = APIRouter(prefix="/v1/content", tags=["content"])


@router.get("", response_model=ContentOut)
async def content() -> ContentOut:
    return get_content()

