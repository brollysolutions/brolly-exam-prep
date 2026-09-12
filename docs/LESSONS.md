# Design implementation decisions

## 12 September 2026 — Constable Mock Test 02 source import

- A document can refer the Telugu section back to English questions rather than repeat them. Expand that reference without doubling the question count, and attach shared passages to every dependent question.
- Preserve Word equation structure instead of reading only paragraph text: fractions, nested brackets, powers and matrices otherwise lose meaning.
- Check option letters against both the summary key and detailed explanation. Record unambiguous corrections separately from unresolved authoring errors; bind editorial corrections to the source file hash.
- Export new papers to the server catalogue and test withheld solutions over the actual API, including the 409 response before submission. Adding an authored TypeScript bank alone does not publish it to clients.

## 11 September 2026 — application reliability audit

- A connection change must not replace an already initialized exam with a global loading/error gate. Keep the current screen and retry queued work independently.
- Make retaking explicit on mobile as well as web. A different test link must preserve the running answers and deadline.
- Device storage warnings belong outside catalogue loading so a failed cache write cannot hide the recovery action. Bound warning height and allow large text to scroll.
- Persist submission time at the user's action, and verify asynchronous attempt identity before saving recovered data. A later network response must not redefine the completed attempt.
- Cache failures are separate from network failures: an optional browser cache must never reject a successful online page response.

## 9 September 2026 — application audit

- A save indicator is a data contract. Cache successful reads, retain dirty keys and deletion tombstones, and restore durable storage before claiming recovery. A successful unrelated write must not hide earlier failed writes.
- Provenance belongs beside the content, including spoken card names and review screens. A demo title alone does not explain repeated questions.
- Question navigation needs a focus destination. Focus the numbered legend after closing the palette; leave ordinary radio navigation intact and avoid live timer announcements.
- Text scaling changes layout. Use minimum touch heights, wrapping labels, adaptive palette columns, and bounded scrolling for action bars/dialogs. Do not shrink the user's chosen text size.
- Modal cancellation is explicit. A secondary action can be Leave, so hardware Back must never guess that the secondary action is safe.
- Invalid input and missing input need different feedback, while the evaluator's numeric thresholds remain unchanged.
- A submitted result must survive a page reload without silently creating a new attempt. Retaking is a deliberate action.
- Keep original audit observations separate from implementation evidence. Passing component tests does not certify native accessibility; verify focus return and text scaling on devices.
