# Constable Mock Test 02

Source: user-supplied `BrollyExamPrep constable 2.docx`. It contains the complete
paper, rather than three external hyperlinks. Its internal heading says "MOCK
TEST 01"; the application uses **Constable Mock Test 02** as requested.

The new test ID is `pc-constable-02`. The existing Constable 01 paper and its saved
attempts keep their IDs and content. Both clients download the new test from the API;
the question bank is not imported by mobile or web release screens.

- 200 questions, 200 marks, 180 minutes, one mark per correct answer, no negative marks.
- English 25, arithmetic 35, reasoning 40, general studies 100.
- English and Telugu questions, options and explanations. The source instructs
  Telugu readers to use the English Q001–Q025, so those questions are copied into
  both language versions. They are counted once, not as additional questions.
- The shared comprehension passage appears with every question Q021–Q025.
- Word equations preserve parentheses, fractions, powers, vincula and matrices.
- Question and attempt paper endpoints omit keys and explanations. Result and
  solution endpoints return 409 until submission, then expose all 200 solutions.

Website routes:

- `/test/constablemocktest02`
- `/test/constablemocktest02/result`
- `/test/constablemocktest02/solution`

The existing Constable catalogue filter displays the new free test. ID-based URLs
and plural `/solutions` bookmarks redirect to the corresponding named routes.

## Source content review

The source has 26 disagreements between its summary answer table and detailed
solution letters. In addition, several solution letters contradict their own
explanation or the option order. The import applies **26 unambiguous option-letter
corrections** using the source explanations, recorded with reasons in
`constable-mock-02.sources.json`. Summary-table conflicts and corrections are
different sets; they are not counted as 52 distinct questions.

The full question/option/explanation wording is retained. Sixteen questions have
remaining source review flags, including missing underlines, contradictory worked
solutions and some questions with no correct listed option. These flags are
recorded in the source report; this import is not a certification that the authored
paper is academically correct. For example, Q027 evaluates to 94/3, absent from its
options; Q075 calculates 56 but offers 55; Q089 allows all four supplied words.
Their source solution keys are retained pending author revision. The pattern's
existing `verified: false` status remains false.

## Reproduce

```powershell
python apps/web/scripts/import_constable_mock_02.py "C:/Users/mouli/Downloads/BrollyExamPrep constable 2.docx" --output apps/web/data/papers/constable-mock-02.ts --report docs/constable-mock-02.sources.json
pnpm --filter web exec tsx scripts/export-api-catalog.ts
pnpm --filter web test
docker compose exec -T api pytest -q
pnpm --filter web exec tsx scripts/smoke-api.ts http://localhost:3201/api
```

The importer validates consecutive numbering, four options, bilingual completeness,
shared passages, the summary table and solution counts. It fails on unexpected
content instead of silently dropping questions. Editorial records live in
`apps/web/scripts/constable_mock_02_review.json` and are included in each generated
source report with the DOCX SHA-256.

Rebuild/deploy the API and web services to publish the content and named routes.
Local verification does not deploy changes to the public domain.

## Verification on 12 September 2026

- Web: 40 tests passed; typecheck and lint passed.
- Backend: 24 tests passed against PostgreSQL; Ruff passed.
- Production Docker API/web images built and local services updated.
- HTTP smoke: all eight catalogue entries / 1,440 questions loaded; all four full
  imported papers passed create, save, submission, persisted results, 200 solutions,
  pre-submission 409 and idempotent submission checks.
- New exam/result/solution URLs return 200; ID and plural-solution aliases redirect
  to the expected named routes.
- All seven pre-existing catalogue entries and papers compare equal to HEAD.
- Re-importing the DOCX produces byte-identical question and source-report files.
- No browser connection was available for interactive visual verification. Remote
  public deployment was not performed.
