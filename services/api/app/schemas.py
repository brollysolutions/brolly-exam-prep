"""Pydantic v2 request/response models.

Every model here has a matching zod schema in packages/api-contracts/src/index.ts
-- keep the two in sync (see .claude/rules/api.md).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Lang = Literal["en", "te"]
Post = Literal["pc", "si"]
Category = Literal["OC", "EWS", "BC", "SC", "ST", "ExS"]


class LocalizedText(BaseModel):
    en: str
    te: str


class LocalizedOptions(BaseModel):
    en: list[str]
    te: list[str]


# ------------------------------------------------------------ Sign-in ----


class PhoneSignInIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)


class UserOut(BaseModel):
    id: str
    phone: str


class PhoneSignInOut(BaseModel):
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


class SectionSpecOut(BaseModel):
    id: str
    label_key: str
    questions: int
    unlock_after: str | None = None


class ExamPatternOut(BaseModel):
    id: str
    post: Post
    total_questions: int
    duration_minutes: int
    marks_per_correct: float
    negative_per_wrong: float
    qualifying_only: bool
    sections: list[SectionSpecOut]
    verified: bool
    source: str


class AttemptedSummaryOut(BaseModel):
    best_score: float
    attempts: int


class TestMetaOut(BaseModel):
    id: str
    kind: Literal["full", "previous"]
    title: LocalizedText
    pattern: ExamPatternOut
    full_mocks_only: bool = False
    listed: bool = True
    free: bool
    attempted: AttemptedSummaryOut | None = None


class PaperQuestionOut(BaseModel):
    """Question delivered before submission: deliberately no answer key or explanation."""

    id: str
    section: str
    text: LocalizedText
    options: LocalizedOptions
    avg_seconds: int = 0


# ------------------------------------------------------------ Attempts ----


class AttemptCreateIn(BaseModel):
    test_id: str
    # Optional client-owned idempotency key (the device's local attempt id). When
    # present, a repeated create for the same user returns the same server attempt,
    # so an offline-created attempt can be safely (re)created without duplicating it.
    client_attempt_id: str | None = None


class AttemptOut(BaseModel):
    id: str
    test_id: str
    started_at: datetime
    ends_at: datetime
    status: Literal["in_progress", "submitted", "auto_submitted"]


class AttemptAnswerOut(BaseModel):
    question_id: str
    choice: int | None = None
    marked: bool = False


class AttemptDetailOut(AttemptOut):
    answers: list[AttemptAnswerOut]


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


class ResultActionOut(BaseModel):
    id: str
    title: LocalizedText
    sub: LocalizedText


class ResultReviewRowOut(BaseModel):
    question_no: int
    your: int | None = None
    seconds: int = 0


class ResultDetailOut(BaseModel):
    id: str
    test_title_n: int
    title: LocalizedText | None = None
    score: float
    max_score: float
    cutoff_pct: float
    qualified: bool
    rank: int | None = None
    total_candidates: int | None = None
    accuracy_pct: float
    avg_seconds_per_question: float
    negative_marks: float
    correct: int
    wrong: int
    skipped: int
    actions: list[ResultActionOut]
    review: list[ResultReviewRowOut]


class ReviewQuestionOut(PaperQuestionOut):
    your_choice: int | None = None
    marked: bool = False
    correct_choice: int
    explanation: LocalizedText
    seconds: int = 0


# ------------------------------------------------------------- Content ----


class NoticeOut(BaseModel):
    id: str
    kind: Literal["notification", "admit_card", "exam_date", "result", "pet"]
    date: str
    title: LocalizedText
    body: LocalizedText
    link: str | None = None


class AffairOut(BaseModel):
    id: str
    date: str
    category: Literal["india", "telangana", "world", "sports", "awards"]
    headline: LocalizedText
    summary: LocalizedText


class StudyBlockOut(BaseModel):
    kind: Literal["heading", "para", "bullets", "formula", "example", "tip"]
    text: LocalizedText | None = None
    items: list[LocalizedText] | None = None


class StudyTopicOut(BaseModel):
    id: str
    section: str
    title: LocalizedText
    minutes: int
    blocks: list[StudyBlockOut]


class StudySectionOut(BaseModel):
    id: str
    label_key: str
    topics: list[StudyTopicOut]


class ExamInfoOut(BaseModel):
    pwt_date: str
    label: LocalizedText


class CategoryOut(BaseModel):
    id: str
    label_key: str
    qualifying_pct: float


class StandardOut(BaseModel):
    value: float
    dir: Literal["min", "max"]
    verified: bool


class ChestStandardsOut(BaseModel):
    unexpanded: StandardOut
    expansion: StandardOut


class PhysicalStandardsOut(BaseModel):
    post: Post
    gender: Literal["male", "female"]
    group: Literal["general", "st"]
    height: StandardOut
    chest: ChestStandardsOut | None = None
    run_1600m: StandardOut | None = None
    run_800m: StandardOut | None = None
    run_100m: StandardOut | None = None
    long_jump: StandardOut
    shot_put: StandardOut
    shot_kg: float


class ContentOut(BaseModel):
    version: str
    notices: list[NoticeOut]
    affairs: list[AffairOut]
    study_sections: list[StudySectionOut]
    exam_info: ExamInfoOut
    categories: list[CategoryOut]
    cost_rows: dict[str, list[list[str]]]
    physical_standards: list[PhysicalStandardsOut]
    standards_notification_year: int
