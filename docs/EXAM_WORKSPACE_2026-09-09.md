# Exam workspace based on supplied references

The five supplied competitor screenshots are applied to the website's exam journey:

| Reference | Website implementation |
| --- | --- |
| 111952 and 112011 | General instructions, illustrated question states, candidate sidebar, independent reading area and persistent Next action |
| 112059 | Test-specific duration, marks and sections; explicit test-language choice; declaration; readiness button |
| 112129 | Full-width exam header, deadline timer, fullscreen control, sections, question metadata, plain radio responses, collapsible palette and bottom actions |
| 112152 | Submission confirmation with a section-by-section answer/review summary |

The supplied yellow umbrella is the only website logo: the favicon and all exam/preparation headers use the same original artwork. The navy/gold B mark has been removed from the website assets. Website typography, shared semantic colors and touch sizes remain in use. Candidate is a generic practice identity; the reference screenshot's personal name is not hardcoded. Report is deferred at the user's request.

## Behavior

- Opening a new paper loads instructions without starting an attempt or countdown. Test language initially shows “Select language”, even when a browser language preference exists. Candidates must choose English or Telugu and check the declaration before starting. The selected language applies when the attempt begins; returning between instruction steps preserves the choice, while a new preparation/retake asks again. Existing running attempts resume with their original deadline.
- Duration, question counts, marks and section prerequisites come from the selected paper. Instructions explain this app's actual immediate autosave, offline behavior and repeat practice.
- Mark for Review & Next adds a review flag and advances. A separate unmark action removes it. Save & Next preserves immediate autosave; the final question opens the confirmation. Neither action bypasses section locks or deadline checks.
- The sidebar shows the current section, five exclusive palette states and accessible question labels. The submission table's review column overlaps answer counts, with an explanation beneath the table.
- Question Paper displays questions and options for unlocked sections. It never renders solutions. Instructions and paper dialogs do not pause the timer and close on automatic submission.
- Returning from the palette or paper preview focuses the destination question. Mobile layouts use a question dialog, and controls retain shared minimum touch sizes. Short viewports and enlarged text allow document scrolling instead of compressing the reading area to a single line.
- Failed browser writes retain the existing visible warning and retry mechanism. No new claim of successful saving is shown while storage is unavailable.

## Validation

- 26 web tests pass, including four new checks for section boundaries, option zero, overlapping review counts, clearing marked answers and empty summaries.
- TypeScript, ESLint and the production build pass. `git diff --check` passes.
- Browser checks cover instructions/readiness, marks and actual test duration, answering/clearing, mark-and-advance, section navigation, fullscreen, sidebar collapse, paper preview, instructions, keyboard focus and submission summaries.
- Explicit language choice checked with an existing Telugu preference: initial selection remains empty, agreement alone cannot start an attempt, the choice survives Previous/Next, both English and Telugu apply correctly at start, and a retake asks again. Production build, lint and type checks pass after this update.
- A production service-worker session resumes offline with identical saved answers and deadline, submits offline, and reloads its result without starting a retake. Explicit retake returns to instructions while preserving the submitted record until the next attempt starts.
- Deadline expiry with Instructions open automatically submits and closes the dialog.
- A simulated storage quota failure displays the warning, retains the selected answer in memory, uses accurate submission copy and persists the answer after Retry saving.
- English and Telugu layouts checked at desktop, 390px and 320px widths; 720×450 layout and 200% text scaling checked for horizontal overflow and readable question area. Palette columns adapt to small dialogs.
- Main text contrast is 18.74:1, muted text on the sidebar 5.39:1, answered text on gold 16.76:1, review text 18.74:1 and focus outline on white 4.85:1. Exam control borders reuse the darker existing muted-foreground token to exceed 3:1.

Refactoring UI diagnostic: **10/10 (8 of 8 rows)** as a heuristic visual assessment: hierarchy in blur and grayscale, whitespace, subdued labels, consistent spacing, constrained reading width, contrast and appropriate modal elevation. No remaining diagnostic gap was identified. This score is not a claim of user testing or a full accessibility certification.

Browser screenshots and the production build log are in the ignored `.playwright-mcp/` directory (`cbt-production-*`, `cbt-text-scale-200-final.png`, `exam-workspace-build.log`). Changes are local; no live deployment was performed.
