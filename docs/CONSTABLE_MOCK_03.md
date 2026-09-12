# Constable Mock Test 03

Imported from the user-supplied `BrollyExamPrep constable 3.docx`. The file itself
contains all 200 questions and their bilingual explanations; it has no external
question links or embedded images. The front matter still says Part 1 / Q001–Q050
/ 45 minutes, but the document continues through Q200 in both question sections
and through all 200 solutions. The full mock uses the existing Constable pattern
of 180 minutes and the requested title **Constable Mock Test 03**.

- ID: `pc-constable-03`; free full mock, 200 questions, 200 marks, no negative marks.
- English 25, Arithmetic 35, Reasoning 40, General Studies 100.
- English language questions Q001–Q025 appear in English in both language modes,
  as explicitly instructed by the source. Translations are not counted twice.
- The modern-penology comprehension passage accompanies each of Q021–Q025.
- Source equations are extracted from Word maths, including fractions, roots,
  superscripts and subscripts. Multi-paragraph calculations stay in solutions.
- Q184's source label `తెలుగు స్వభావం` is treated as its Telugu explanation.
- All source answer letters and explanation wording are retained. No academic
  correction or independent factual validation is claimed. Q002 and Q014 refer
  to underlined segments; plain-text rendering does not preserve Word run styling.
  These two review flags are included in `constable-mock-03.sources.json`.

Routes:

- `/test/constablemocktest03`
- `/test/constablemocktest03/result`
- `/test/constablemocktest03/solution`

The ID-based routes and plural `/solutions` variant redirect to these named
routes. Existing Constable and SI mock IDs, content and saved attempts are
unchanged. The API exports the new test so mobile and web download its content;
release screens do not bundle this question bank.

Question and attempt-paper responses omit answer keys and explanations. Review
endpoints return 409 until submission, then return all 200 answers/explanations.
The existing UI also closes review access during an active retake.

## Reproduce

```powershell
python apps/web/scripts/import_constable_mock_03.py "C:/Users/mouli/Downloads/BrollyExamPrep constable 3.docx" --output apps/web/data/papers/constable-mock-03.ts --report docs/constable-mock-03.sources.json
pnpm --filter web exec tsx scripts/export-api-catalog.ts
```

The source report records the DOCX SHA-256, numbering, section counts, source
timing, solution-label normalization and the answer distribution. The importer
rejects missing/duplicate questions or keys, split options, unexpected trailing
question text, missing bilingual explanations and solution labels in questions.

## Verification

- Web: 44 tests passed, including the new paper and submission/retake review flow.
- API: 36 tests passed, including real PostgreSQL submission and all 200 solutions.
- All nine existing exported catalogue entries and their papers compare equal to
  HEAD; the only added entry is Constable 03 (10 tests / 1,840 questions total).
- Re-importing the document matches the generated bank and source report exactly.
- Production web build (including lint/types) and targeted backend Ruff checks passed.
- Local API restarted with the new catalogue; website rebuilt. HTTP smoke passed
  for all six full imported papers, including saving answers, pre-submit 409s,
  submission, stored results, all 200 solutions and idempotent resubmission.

The public server requires deployment of the updated backend content and web
routes. Local verification does not update the production website or build an AAB.
