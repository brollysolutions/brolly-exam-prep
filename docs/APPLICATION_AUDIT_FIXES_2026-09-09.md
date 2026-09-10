# Application audit fixes — 9 September 2026

Implemented after the user approved fixing the issues in [the application audit](APPLICATION_AUDIT_2026-09-09.md). Changes cover the website, mobile UI, shared demo metadata, and bilingual messages. No deployment was performed.

## Changes and before/after comparison

| Finding / screen | Before | Implemented behavior |
| --- | --- | --- |
| F01 — web storage, Home, Profile, exam, result | Failed writes silently switched to memory, while copy still claimed data was saved. | Cache reads, retain failed writes and deletions, expose temporary storage, and offer Retry saving. The persistent scrolling warning advises keeping the tab open. Retry flushes pending changes; all save claims reflect storage status. The offline fallback page avoids unconditional save claims. |
| F02 — Tests, paper, attempt, result, solutions | Repeated demonstration questions appeared under previous-year paper names without identifying the source. | Shared metadata marks generated papers as demos. Previous-paper titles explicitly say demo; cards and readers explain repeated sample content. Native attempts and review screens also disclose demos. Imported papers retain their content and marking. |
| F03 — mobile Home | Sample exam countdown and news looked current or official. | Visible and spoken sample-schedule notice; sample labels above updates and current affairs. |
| F04 — web exam | Next left focus on the navigation button, so Tab skipped the new answer group. | Successful Next, Previous, section, and palette navigation focus the numbered question legend; Tab proceeds into the radios. The timer remains outside live announcements. |
| F05 — narrow web exam | Timer scrolled away; Next wrapped incidentally below the other controls. | Sticky timer/header, explicit three-column navigation, and fixed action bar. Measured footer space prevents answer content from being covered. Short landscape and enlarged text have bounded controls. |
| F06 — mobile Profile | Spoken Post and Category omitted their selected values. | Composed accessible names include the localized selection; absent values say Not selected. |
| F07 — web Telugu headings | Secondary headings inherited Latin negative tracking and compressed line spacing. | All Telugu heading levels use normal tracking and 1.6 line height; question text keeps 1.8. |
| F08 — navigation and palette | Some targets were about 40px; native palette always divided its width into six cells. | Web navigation and palette meet the 48px minimum. Native palette adapts column count and cell size to width and font scale; cells speak answer state with their number. |
| F09 — Eligibility | Invalid typed values appeared as Not entered. | Inline bilingual errors, invalid accessibility state, and focus on the first invalid measurement when checking. Native minutes/seconds errors remain visible even when their combined numeric value is empty. Blank drafts and the underlying standards/evaluation rules retain their semantics. |
| F10 — web Welcome and preferences | Copy promised three-hour tests, phone saving, signal-dependent submission, and preference-driven test selection. | Copy describes each card's actual duration, offline answering/submission, browser saving and warnings, and the scope of the post preference. |
| Polish — Study | Large decorative cards made short topic lists slow to scan. | Topic-only padding reduced to 16px and decorative heading bars removed. Full titles and read marks remain. |
| Polish — Home/results | Wrapped statistic labels misaligned the values. | Shared grid rows align labels and numbers without a fixed label height. |
| Polish — Profile | Empty history gave no next action; a reminder checkbox implied scheduling. | Empty history leads to Tests. Reminders display an availability note. |
| Polish — paper loading | Loading said Nothing yet. | Bilingual Loading paper status. |
| R01 — native controls, tabs, exam, dialogs | Fixed button heights and widths constrained larger text. | Buttons grow from 48/56px minima and allow labels to wrap. Large-text exam controls stack in a bounded scrollable footer. Tab labels wrap and the bar grows with font scale. Dialogs scroll within available safe-area height; login exposes visible and accessible busy state. |
| R02 — native confirmations | Animated overlays relied on screen-specific Back behavior and left the background native tree present. | Shared RN Modal supplies a separate modal window, focuses its title on show, and calls an explicit safe dismissal callback on hardware Back. Submit/delete/leave actions are never inferred as cancellation. Auto-submit acknowledgment remains explicit. |
| Additional reload regression — web result | Reloading a submitted exam URL saved the old result but silently started another attempt. | A submitted paper remains on its result after reload. Practise again explicitly starts the next attempt. |

## Verification

Completed checks:

- Mobile: **933 tests in 100 suites, all 15 snapshots passed**. Includes safe modal Back/cancellation and invalid measurement/run feedback. TypeScript and ESLint passed without warnings.
- Website: **22 tests passed**, including four new storage recovery cases. Production build, TypeScript, and ESLint passed. Next's worker initially hit Windows sandbox `spawn EPERM`; the approved build outside the sandbox passed.
- Shared English/Telugu locale parity and interpolation: **4 tests passed**. Shared design-token tests passed during the original audit (45 tests); token values were not changed.
- Production browser test at `http://localhost:3203`: SI Test 02 retained its selected answer, review mark, exact deadline, and attempt ID through offline reload. Offline submission and another reload retained the submitted result. Reload no longer starts a retake.
- Production quota simulation: the warning remained at viewport y=0 while scrolled; the timer stayed below it. Retry saved the pending answer, and reload retained that answer and the same deadline. A blocked submission showed temporary-result wording rather than claiming a saved result.
- Keyboard: Next focused the numbered legend, then Tab focused the radio group; selecting Q4 through the palette also focused its legend. Palette targets measured **52.4 × 52.4px** at 320px; main navigation measured **48px** high.
- Eight web routes checked in both languages at 320px: Home, Study, Profile, post preference, Welcome, previous-paper catalogue, paper reader, Eligibility. None had horizontal document overflow. Demo disclosures appeared in both languages; invalid input focused its field, displayed the translated unit error, and cleared after correction.
- Exam layout checked at 320×900, 390×844, and 667×375, plus a 200% root-font-size probe at 320px and 1280px. No horizontal document overflow in those states. The root-font-size probe is not a native Dynamic Type or complete browser-zoom test.
- `git diff --check` passed. Updated snapshots were reviewed for minimum-height, wrapping, modal structure, and intentional copy changes.

Native device accessibility remains a separate verification item: ADB reported no connected devices. Automated RN tests do not establish TalkBack/VoiceOver isolation, focus return, hardware Back behavior, or real-device text layout. Verify those on Android and iOS before claiming native accessibility conformance.

Browser screenshots: [English exam at 320px](../.playwright-mcp/audit-fixed-exam-320.png), [Telugu exam at 320px](../.playwright-mcp/audit-fixed-exam-te-320.png). These replace the corresponding pre-fix exam captures linked in the original audit. Browser failure tests use isolated contexts and synthetic local practice data.

Additional captures: [save warning while scrolling](../.playwright-mcp/audit-fixed-storage-warning-320.png), [Telugu Study](../.playwright-mcp/audit-fixed-study-te-320.png), [demo catalogue](../.playwright-mcp/audit-fixed-demo-en-320.png), [English input error](../.playwright-mcp/audit-fixed-eligibility-en-320.png), [Telugu input error](../.playwright-mcp/audit-fixed-eligibility-te-320.png).

## Design contracts

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [LESSONS.md](LESSONS.md), and [progress.txt](progress.txt). No new UI dependency or brand token was added.
