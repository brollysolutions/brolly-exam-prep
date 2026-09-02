"""initial schema: users, otp_codes, tests, sections, questions, attempts, answers, results

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-02 00:00:00

Hand-written (autogenerate-equivalent) to mirror app/models.py exactly.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(length=15), nullable=False),
        sa.Column("post", sa.String(length=8), nullable=True),
        sa.Column("category", sa.String(length=8), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("phone", name="uq_users_phone"),
    )
    op.create_index("ix_users_phone", "users", ["phone"])

    op.create_table(
        "otp_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("phone", sa.String(length=15), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("request_id", name="uq_otp_codes_request_id"),
    )
    op.create_index("ix_otp_codes_request_id", "otp_codes", ["request_id"])
    op.create_index("ix_otp_codes_phone", "otp_codes", ["phone"])

    op.create_table(
        "tests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("post", sa.String(length=8), nullable=False, server_default="pc"),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("total_marks", sa.Float(), nullable=False),
        sa.Column("cutoff", sa.Float(), nullable=False, server_default="40.0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("slug", name="uq_tests_slug"),
    )
    op.create_index("ix_tests_slug", "tests", ["slug"])

    op.create_table(
        "sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "test_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_sections_test_id", "sections", ["test_id"])

    op.create_table(
        "questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "test_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "section_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("text", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("correct_index", sa.Integer(), nullable=False),
        sa.Column(
            "explanation",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.create_index("ix_questions_test_id", "questions", ["test_id"])
    op.create_index("ix_questions_section_id", "questions", ["section_id"])

    op.create_table(
        "attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "test_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="in_progress"),
        sa.Column(
            "started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_attempts_test_id", "attempts", ["test_id"])
    op.create_index("ix_attempts_user_id", "attempts", ["user_id"])

    op.create_table(
        "answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "question_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("questions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("choice", sa.Integer(), nullable=True),
        sa.Column("marked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("attempt_id", "question_id", name="uq_answer_attempt_question"),
    )
    op.create_index("ix_answers_attempt_id", "answers", ["attempt_id"])
    op.create_index("ix_answers_question_id", "answers", ["question_id"])

    op.create_table(
        "results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "test_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False),
        sa.Column("cutoff", sa.Float(), nullable=False),
        sa.Column("qualified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "per_section",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "wrong", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("attempt_id", name="uq_results_attempt_id"),
    )
    op.create_index("ix_results_attempt_id", "results", ["attempt_id"])
    op.create_index("ix_results_test_id", "results", ["test_id"])


def downgrade() -> None:
    op.drop_table("results")
    op.drop_table("answers")
    op.drop_table("attempts")
    op.drop_table("questions")
    op.drop_table("sections")
    op.drop_table("tests")
    op.drop_table("otp_codes")
    op.drop_table("users")
