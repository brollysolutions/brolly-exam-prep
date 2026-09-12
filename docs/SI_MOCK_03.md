# SI Mock Test 03

The three user-supplied documents form one free bilingual mock test, identified by
`si-brolly-03`:

| Source file | Section | Questions in combined test | Time |
| --- | --- | --- | --- |
| BrollyExamPrep arthamatic si 3.docx | Arithmetic | 1–50 | 50 minutes |
| BrollyExamPrep reasoning si 3.docx | Reasoning | 51–100 | 50 minutes |
| BrollyExamPrep si gs3.docx | General Studies | 101–200 | 90 minutes |

Total: **200 questions, 200 marks, 180 minutes**, one mark per correct answer and
no negative marking, following the supplied papers. English and Telugu are two
versions of each question, not separate questions. The pattern is not marked as
officially verified. The individual source papers total 190 minutes, but the
application uses one 180-minute timer for every SI mock test, as requested on
12 September 2026. Source-document timing remains in the provenance table above.

Website routes:

- `/tests/simocktest03`
- `/tests/simocktest03/result`
- `/tests/simocktest03/solutions`

The SI catalogue filter displays the test after SI Mock Test 02. ID-based exam,
result and solutions URLs redirect to these routes. Earlier test IDs, papers,
attempts and saved results are preserved.

## Questions first, solutions after submission

The authored bank is exported to the backend. Mobile and web clients download it
through their existing API integration; the bank is not imported into release
screens. Question and attempt paper responses omit keys and explanations.
Result and solution endpoints return 409 before submission, then provide the
complete 200-question review after manual or timed submission. A retake closes
review again until that attempt is submitted.

Reasoning source Q021 (combined question 71) contains a pasted answer, a solved
Venn diagram and conversation within the English question section. The importer
keeps only its question and four textual options there. The bilingual explanation
describes every diagram relationship after submission: surgeons are inside
doctors, and musicians intersect both. The image itself is not rendered by the
current text-only solution view; its file hash and role are recorded in the source
report. Conversational apologies, follow-up offers and the Telugu introductory
sentence are excluded from the test.

Arithmetic Q048 depends on the district table in Q034; that table is repeated
inside Q048 in both languages so the question is self-contained. Word fractions,
powers, brackets, matrices and automatic statement numbering use the existing
OOXML parser instead of flattened paragraph text.

## Source accuracy and provenance

`si-mock-03.sources.json` records each source SHA-256, section, duration, question
and solution count, actual answer distribution and import repairs. Question IDs
retain their source section and question number; review flags also include the
combined test question number.

The supplied answer keys and academic explanation wording are preserved. There
are **40 automated review flags** (15 arithmetic, 16 reasoning, 9 GS). These mark
contradictory, approximate or corrective wording; they are review candidates,
not 40 independently validated errors. For example, arithmetic Q001 works out
38 (option C) but later insists on the supplied key B (35); reasoning Q001 changes
its proposed coding rule within the explanation. This import does not silently
replace ambiguous author answers or certify the source's academic correctness.
There are no explicit `Answer:`-label disagreements in the GS solutions versus
their summary key.

## Reproduce

```powershell
python apps/web/scripts/import_si_mock_03.py "C:/Users/mouli/Downloads/BrollyExamPrep arthamatic si 3.docx" "C:/Users/mouli/Downloads/BrollyExamPrep reasoning si 3.docx" "C:/Users/mouli/Downloads/BrollyExamPrep si gs3.docx" --output apps/web/data/papers/si-mock-03.ts --report docs/si-mock-03.sources.json
pnpm --filter web exec tsx scripts/export-api-catalog.ts
pnpm --filter web test
docker compose exec -T api pytest -q
pnpm --filter web exec tsx scripts/smoke-api.ts http://localhost:3201/api
```

The importer rejects missing/duplicate questions, incomplete languages, missing
keys or solutions, unexpected media and unexpected question/option trailing
content. The known pasted Q021 solution is handled explicitly, not by globally
truncating unexpected content.

Deploy the API and web services to publish the new content and named routes.
Local build/test success does not deploy to the public domain.

## Verification on 12 September 2026

- Web: 42 tests passed, including combined source coverage, removal of the pasted
  answer, shared-table availability, routes and submission/retake review gates.
- API: 25 tests passed against PostgreSQL; Ruff passed. Web typecheck and lint passed.
- Production Docker API and web images built successfully and updated locally.
- Real HTTP smoke loaded nine tests / 1,640 questions and passed create, save,
  pre-submission 409, submission, persisted result, all 200 solutions and idempotent
  submission checks for all five imported full papers.
- Exam/result/solutions URLs return 200; all three ID aliases redirect correctly.
- All eight earlier catalogue entries/papers match the pre-import snapshot.
- Re-importing all three DOCX files produces byte-identical generated questions
  and source reports.
- Interactive browser/device checks and public deployment were not performed.
