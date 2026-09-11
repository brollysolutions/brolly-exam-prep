"""Validated, generated non-test content served by ``GET /v1/content``."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.schemas import ContentOut

_CONTENT_FILE = Path(__file__).with_name("content_fixture.json")


@lru_cache(maxsize=1)
def get_content() -> ContentOut:
    """Load once per process; response validation then covers every request."""
    return ContentOut.model_validate(json.loads(_CONTENT_FILE.read_text(encoding="utf-8")))

