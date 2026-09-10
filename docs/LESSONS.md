# Design implementation decisions

## 9 September 2026 — application audit

- A save indicator is a data contract. Cache successful reads, retain dirty keys and deletion tombstones, and restore durable storage before claiming recovery. A successful unrelated write must not hide earlier failed writes.
- Provenance belongs beside the content, including spoken card names and review screens. A demo title alone does not explain repeated questions.
- Question navigation needs a focus destination. Focus the numbered legend after closing the palette; leave ordinary radio navigation intact and avoid live timer announcements.
- Text scaling changes layout. Use minimum touch heights, wrapping labels, adaptive palette columns, and bounded scrolling for action bars/dialogs. Do not shrink the user's chosen text size.
- Modal cancellation is explicit. A secondary action can be Leave, so hardware Back must never guess that the secondary action is safe.
- Invalid input and missing input need different feedback, while the evaluator's numeric thresholds remain unchanged.
- A submitted result must survive a page reload without silently creating a new attempt. Retaking is a deliberate action.
- Keep original audit observations separate from implementation evidence. Passing component tests does not certify native accessibility; verify focus return and text scaling on devices.
