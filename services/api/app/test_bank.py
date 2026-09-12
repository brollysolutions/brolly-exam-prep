"""Validated source-authored papers exported from the website's existing catalogue."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

from app.schemas import PaperQuestionOut, TestMetaOut


class BankQuestion(PaperQuestionOut):
    correct_choice: int = Field(ge=0, le=3)
    explanation: dict[str, str]

    @model_validator(mode="after")
    def validate_copy(self) -> BankQuestion:
        for lang in ("en", "te"):
            if len(getattr(self.options, lang)) != 4 or not self.explanation.get(lang):
                raise ValueError(f"Missing options or explanation: {self.id}/{lang}")
        return self


class BankPaper(BaseModel):
    meta: TestMetaOut
    cutoff_pct: float = Field(ge=0, le=100)
    questions: list[BankQuestion]

    @model_validator(mode="after")
    def validate_questions(self) -> BankPaper:
        pattern = self.meta.pattern
        if len(self.questions) != pattern.total_questions:
            raise ValueError(f"Question count mismatch: {self.meta.id}")
        if len({q.id for q in self.questions}) != len(self.questions):
            raise ValueError(f"Duplicate question IDs: {self.meta.id}")
        section_ids = {s.id for s in pattern.sections}
        if len(section_ids) != len(pattern.sections):
            raise ValueError("Duplicate sections")
        if any(q.section not in section_ids for q in self.questions):
            raise ValueError("Unknown question section")
        expected_order = []
        for section in pattern.sections:
            expected_order.extend([section.id] * section.questions)
        if [q.section for q in self.questions] != expected_order:
            raise ValueError(f"Question order/section counts mismatch: {self.meta.id}")
        return self


def load_bank() -> dict[str, dict]:
    path = Path(__file__).with_name("test_bank.json")
    papers = [BankPaper.model_validate(p) for p in json.loads(path.read_text(encoding="utf-8"))]
    if not papers or len({p.meta.id for p in papers}) != len(papers):
        raise ValueError("Empty bank or duplicate paper IDs")
    return {p.meta.id: p.model_dump() for p in papers}


PAPERS = load_bank()
