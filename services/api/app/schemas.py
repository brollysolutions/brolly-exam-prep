"""Pydantic v2 request/response models.

Every model here has a matching zod schema in packages/api-contracts/src/index.ts
-- keep the two in sync (see .claude/rules/api.md).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Lang = Literal["en", "te", "ur"]
Post = Literal["pc", "si"]
Category = Literal["OC", "EWS", "BC", "SC", "ST", "ExS"]


class LocalizedText(BaseModel):
    en: str
    te: str
    ur: str


class LocalizedOptions(BaseModel):
    en: list[str]
    te: list[str]
    ur: list[str]


# ---------------------------------------------------------------- OTP ----


class OtpRequestIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)


class OtpRequestOut(BaseModel):
    request_id: str
    dev_code: str | None = None


class OtpVerifyIn(BaseModel):
    request_id: str
    code: str = Field(..., min_length=4, max_length=6)


class UserOut(BaseModel):
    id: str
    phone: str


class OtpVerifyOut(BaseModel):
    token: str
    user: UserOut


# --------------------------------------------------------------- Tests ----


class QuestionOut(BaseModel):
    """Public question shape -- no correct_index / explanation."""

    id: str
    section_id: str
    order_index: int
    text: LocalizedText
    options: LocalizedOptions


class SectionOut(BaseModel):
    id: str
    name: LocalizedText
    order_index: int
    questions: list[QuestionOut]


class TestSummary(BaseModel):
    id: str
    slug: str
    title: str
    post: Post
    duration_minutes: int
    total_marks: float
    section_count: int
    question_count: int


class TestDetail(TestSummary):
    sections: list[SectionOut]


# ------------------------------------------------------------ Attempts ----


class AttemptCreateIn(BaseModel):
    test_id: str


class AttemptOut(BaseModel):
    id: str
    test_id: str
    started_at: datetime
    ends_at: datetime
    status: Literal["in_progress", "submitted", "auto_submitted"]


class AnswerPatchIn(BaseModel):
    question_id: str
    choice: int | None = None
    marked: bool = False


class OkOut(BaseModel):
    ok: bool = True


class SubmitOut(BaseModel):
    result_id: str


# ------------------------------------------------------------- Results ----


class SectionScore(BaseModel):
    section_id: str
    name: LocalizedText
    correct: int
    wrong: int
    skipped: int
    marks: float


class WrongAnswer(BaseModel):
    question_id: str
    text: LocalizedText
    options: LocalizedOptions
    your_choice: int | None
    correct_choice: int
    explanation: LocalizedText


class ResultOut(BaseModel):
    id: str
    test_id: str
    attempt_id: str | None = None
    score: float
    max_score: float
    cutoff: float
    qualified: bool
    rank: int | None
    accuracy: float
    per_section: list[SectionScore]
    wrong: list[WrongAnswer]
