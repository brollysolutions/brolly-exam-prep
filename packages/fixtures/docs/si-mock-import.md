# SI Mock Test 01

Imported on 2026-09-07 from the three user-supplied local DOCX files. The source documents were not modified or committed. The user approved correcting faulty questions, options and keys rather than retaining known errors.

| Source file | Combined question numbers | Questions | Source time |
| --- | --- | --- | --- |
| BrollyExamPrep arthamatic 1.docx | 1–50 | 50 | 50 minutes |
| BrollyExamPrep reasoning 1.docx | 51–100 | 50 | 50 minutes |
| BrollyExamPrep GS1.docx | 101–200 | 100 | 90 minutes |

One free paper, `si-brolly-01`, appears under **SI Mock Test** and **Full mocks**. Constable filtering excludes it. The combined practice preset uses 190 minutes, +1 per correct answer, no negative marking, and freely navigable sections. This is not an official exam blueprint or qualifying decision.

## Content review

All 200 questions retain English and Telugu stems and four options, plus a keyed solution. OOXML equations, superscripts/subscripts, numbered statements and tables are preserved as readable plain text. The shared arithmetic table is attached to both questions 49 and 50. No embedded question images were found.

The [correction register](si-mock-corrections.md) records 58 question-level corrections. The correction module contains the final bilingual wording and explanations. It fixes missing valid options, incorrect keys/calculations, contradictory or underdetermined reasoning puzzles and specific factual imprecision. Six repaired arrangement puzzles are exhaustively checked for a unique solution by `scripts/check_si_puzzles.py`.

23 source explanations have no Telugu version; the available English explanation is retained in both language views. No missing explanation was silently dropped. Existing English/Telugu wording outside the reviewed corrections remains source-authored, not a newly certified official answer key.

Factual references used for targeted corrections:

- [SCERT Telangana class 7 Social Studies](https://www.scert.telangana.gov.in/pdf/publication/ebooks2019/7%20social%20em%202020-21.pdf): Rudradeva and the Legislative Council composition.
- [GI Registry: Pochampally Ikat](https://search.ipindia.gov.in/GIRPublicSearch/Application/Details/4): handicraft registration and Telangana area.
- [Wildlife Institute of India: Andhra Pradesh protected areas](https://v1.wii.gov.in/protectedareagazette_andhrapradesh): Papikonda location.
- [Mulugu district: Rythu Bharosa](https://mulugu.telangana.gov.in/scheme/rythu-bharosa-agriculture-support/): scheme purpose and cultivable land.
- [RBI inflation target press release](https://www.rbi.org.in/Commonman/English/scripts/PressReleases.aspx?Id=3294): explicitly dated 2021–26 target.
- [MCR HRD Institute: Presidential Order](https://www.mcrhrdi.gov.in/ASOs/week5/Presidentail%20Order.pdf): Girglani commission context.
- [UNESCO: Ramappa temple](https://whc.unesco.org/en/list/1570/): inscription and lightweight tower bricks.

## Attempt and review behavior

The public attempt URL is `/tests/simocktest`. Results use `/test/simocktest/result` and solutions use `/test/simocktest/solutions`. Old `/test/si-brolly-01` attempt and review links redirect to these URLs. The persistent test ID remains `si-brolly-01` so saved answers and results are unchanged. Other mock URLs are unchanged. The public review slug is resolved to the persistent ID before submission checks and data loading.

During the attempt, the UI renders only the stem/options. Result and solution deep links are gated until submission and gated again during a retake. The previous-paper viewer does not expose this mock. Manual submission and timer expiry grade the actual answers; the review contains all 200 questions, including skipped ones. No sample rank, sample cost analytics, official cut-off verdict or fabricated crowd timing is shown for this paper.

This imported paper uses the app's local/offline attempt flow, not backend attempt endpoints that do not contain its ID. The latest result and answers persist on this device/browser and are cleared on sign-out or local-data wipe; they do not sync across devices. Answer keys are bundled for local scoring. The gate controls normal UI access, not secrecy against browser developer tools.

## Regeneration

From the repository root, run:

```powershell
$env:PYTHONIOENCODING = 'utf-8'
python packages/fixtures/scripts/import_si_mock.py 'C:/Users/mouli/Downloads/BrollyExamPrep arthamatic 1.docx' 'C:/Users/mouli/Downloads/BrollyExamPrep reasoning 1.docx' 'C:/Users/mouli/Downloads/BrollyExamPrep GS1.docx' --output packages/fixtures/src/si-mock-01.ts --report packages/fixtures/docs/si-mock-corrections.md
python packages/fixtures/scripts/check_si_puzzles.py
```

The importer asserts exact source counts, keys and four-option bilingual structure. App tests cover the 200-question bank, section allocation, real manual/timed scores, persistence, sign-out clearing and pre-submission review gates.
