from pathlib import Path

from fastapi import APIRouter

from app.schemas import AppContentOut

router = APIRouter(prefix="/v1/content", tags=["content"])
CONTENT = AppContentOut.model_validate_json(
    (Path(__file__).parents[1] / "content/content.json").read_text("utf-8")
)


@router.get("", response_model=AppContentOut, response_model_exclude_none=True)
async def get_content():
    return CONTENT
