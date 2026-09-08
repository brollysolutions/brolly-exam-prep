# Constable Mock Test 01

## Current paper

Imported on 2026-09-08 from the explicitly supplied
`C:/Users/mouli/Downloads/BrollyExamPrep constable 1.docx`.
This single document already contains a complete 200-question mock, both language
versions, an answer-key table and 200 detailed bilingual solutions. No previous
SI source or withdrawn GS-only paper is included.

The free **Constable Mock Test 01** entry appears in the website Constable and
Full Mock Test categories. It uses the source duration of 180 minutes, 200 marks,
+1 per correct answer, and the existing no-negative-marking practice setting.
The source's official-exam claims have not been independently verified.

| Subject | Question numbers | Count |
| --- | --- | --- |
| English | 001-025 | 25 |
| Arithmetic | 026-060 | 35 |
| Reasoning and Mental Ability | 061-100 | 40 |
| General Studies and Telangana | 101-200 | 100 |

English-language questions remain in English in both mediums, as supplied.
All other questions use the source's English and Telugu versions. The reading
passage is included with every question Q021-Q025. Word maths, statement numbers,
options and bilingual explanations are extracted with the existing OOXML reader.

## Routes and saved attempts

- Attempt: `/test/constablemocktest01`
- Result: `/test/constablemocktest01/result`
- Solutions: `/test/constablemocktest01/solution`
- Storage ID: `pc-constable-01`

The new storage ID isolates this paper from the withdrawn `pc-brolly-01`
100-question GS-only paper. Old withdrawn-ID URLs continue to redirect to
`/tests`. Saved answers and results from that paper cannot unlock or grade this
replacement. Existing SI data and the mobile catalogue are unchanged.

During an attempt the UI renders only question stems and options. Manual or
timed submission saves the result and unlocks answers and explanations for all
200 questions, including skipped questions via the All filter. Starting a retake
closes review again until submission. This uses the existing offline grading
architecture: answer keys are bundled, so UI gating is not server-side secrecy.

## Source discrepancies

The import uses the explicit **Correct Answer** in each detailed solution.
The summary table repeats Q171-Q200 and omits Q131-Q160; all 30 missing keys
are present explicitly in their detailed solutions. Q030 has table key B but
solution key A; Q035 has table key A but solution key B. The imported grading
keys follow the detailed solutions (A and B respectively).

Q026, Q027, Q028, Q038 and Q081 contain unresolved calculation/consistency
issues in the supplied explanations. These are preserved, not silently rewritten.
This is a faithful import, not a mathematical or factual validation of the paper.
The source's claim of 50 answers per letter is also contradicted by its explicit
solution keys: A=33, B=131, C=33, D=3.

Source SHA-256, counts, key recovery and discrepancy details are recorded in
`constable-mock-01.sources.json`.

## Regenerate and verify

```powershell
$env:PYTHONIOENCODING = 'utf-8'
python apps/web/scripts/import_constable_mock_01.py 'C:/Users/mouli/Downloads/BrollyExamPrep constable 1.docx' --output apps/web/data/papers/constable-mock-01.ts --report docs/constable-mock-01.sources.json
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web build
```

Importer assertions check all 200 question/solution numbers, four ordered options
per language, the shared passage, section counts and absence of solution text in
stems/options. Application tests cover source structure, isolated IDs, correct
scoring, skipped-question review, manual/timed submission, retake gates and
existing SI behavior.
