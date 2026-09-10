"""Persist anonymous practice attempts and paper/result snapshots."""

import sqlalchemy as sa

from alembic import op

revision = "0002_practice_attempts"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "practice_attempts",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("test_id", sa.String(64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
    )
    op.create_index("ix_practice_attempts_test_id", "practice_attempts", ["test_id"])


def downgrade():
    op.drop_table("practice_attempts")
