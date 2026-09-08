# SI Mock Test 02

Imported on 2026-09-08 into the Next.js website only, on branch `web`.
The original Word documents, mobile app, shared catalogue and SI Mock Test 01
are unchanged.

| Source | Combined questions | Count | Time |
| --- | --- | --- | --- |
| BrollyExamPrep artamatic2.docx | 1–50 | 50 | 50 minutes |
| BrollyExamPrep reasoing2.docx | 51–100 | 50 | 50 minutes |
| BrollyExamPrep GS2.docx | 101–200 | 100 | 90 minutes |

The website SI Mock Test shelf and Full Mock Test filter show the free
**SI Mock Test 02** card. Persistent ID: `si-brolly-02`. Attempt route:
`/tests/simocktest02`. The old `/test/si-brolly-02` attempt URL redirects there.
Results remain at `/test/si-brolly-02/result`. Solutions use
`/tests/simocktest02/solutions`; the old `/test/si-brolly-02/solutions` URL redirects there.
The persistent ID is unchanged, preserving existing answers, timers and results.
The combined practice preset has 200 questions, 190 minutes, +1 per correct
answer and no negative marking. It is not presented as a verified official
exam blueprint.

English and Telugu questions/options are paired rather than counted twice.
Word equations, numbered statements and tables are extracted through the
existing OOXML reader. The shared arithmetic table is attached to both Q49
and Q50. The documents contain no embedded media requiring image extraction.

Attempts display questions and options only. Results and solution views are
blocked before submission and during a retake, including direct review URLs.
After manual submission or expiry, the existing review shows the keyed answer
and source explanation. The All filter includes skipped questions. Answers and
results are saved in this browser using the existing local imported-paper flow.
Answer keys remain bundled for offline grading; UI gating is not secrecy against
developer tools.

## Source fidelity and limitations

This import preserves source-authored wording, options, answer keys and
explanations; Test 01's correction module is deliberately not applied.
GS Q91 is absent from the common key table, but its detailed solution explicitly
states B (West Bengal). That source answer is used for combined Q191.

The source contains inconsistencies that need a separate editorial review.
For example, arithmetic Q1 gives cash remaining as ₹3,024 and implies
0.70 × 0.35 × 0.20 of the salary remains, which does not yield the keyed ₹72,000.
Its supplied explanation itself discusses the inconsistency. This import does
not certify the source answer key or silently rewrite faulty items.
`si-mock-02.sources.json` records source hashes, recovered keys and heuristic
review flags (flags are review candidates, not validated errors).

## Reproduce

From the repository root:

```powershell
$env:PYTHONIOENCODING = 'utf-8'
python apps/web/scripts/import_si_mock_02.py 'C:/Users/mouli/Downloads/BrollyExamPrep artamatic2.docx' 'C:/Users/mouli/Downloads/BrollyExamPrep reasoing2.docx' 'C:/Users/mouli/Downloads/BrollyExamPrep GS2.docx' --output apps/web/data/papers/si-mock-02.ts --report docs/si-mock-02.sources.json
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web typecheck
```

Import assertions cover all 200 bilingual stems, four nonempty options each,
unique IDs, source keys/solutions and separation of explanations from stems.
Application tests cover catalogue isolation, copied paper data, table context,
manual/timed grading, pre-submission and retake gates and Test 01 preservation.
