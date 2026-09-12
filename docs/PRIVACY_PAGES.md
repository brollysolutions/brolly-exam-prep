# App publishing pages — 12 September 2026

Intended public URLs:

- https://mocktest.brollyexamprep.com/privacy-policy
- https://mocktest.brollyexamprep.com/account-deletion

Both routes render public HTML independently of sign-in, the client-side catalogue
and API availability. They include English content, Telugu summaries, page titles,
canonical URLs and navigation between the two pages. The website footer links to
both pages outside active exams.

Space-containing URLs `/privacy%20policy` and `/account%20deletion` redirect
permanently to the hyphenated URLs. Production build and local HTTP verification
passed: each alias returns 308, followed by 200 with the corresponding content.

## Content and support contact

The user requested complete website copy instead of draft notices. Both pages
now contain the service-specific policy and deletion instructions without draft
banners or awaiting-confirmation text. The privacy page covers SI/Constable
practice, sign-in, answers/results, eligibility inputs, device storage, providers,
retention, security, user choices, younger users, external links and contact.
The deletion page includes an email action, a copyable request example, affected
records, local clearing instructions, follow-up guidance and common questions.

`support@brollyexamprep.com` was found on the existing public
[Brolly privacy policy](https://brollyexamprep.com/privacy-policy/) and homepage
on 12 September 2026. It is used in `apps/web/lib/privacy.ts`, including a mailto
action with prepared subject/body and a plain address. Opening the link is not
represented as sending a request. No email was sent during verification, and
mailbox delivery was not tested.

The public parent policy uses request-specific retention and reasonable response
times rather than a fixed number of days. The new copy follows that approach and
does not invent a fixed deletion deadline or backup-expiry guarantee. Operational
backup, log and correspondence schedules still need to be established by the
operator; the page directs users to support for those details. Indexing is enabled
for the completed content, which is not a claim of Play policy approval.

## Existing behaviour reflected in the copy

- Phone sign-in is process-local in `services/api/app/routers/auth.py`.
- Server `PracticeAttempt` records persist answers, timestamps and results; they
  are not linked to a phone account and do not expire automatically.
- Preferences, eligibility measurements and practice recovery state also live in
  device/browser storage.
- The Android Profile deletion action invokes `wipeLocalData`; it clears local
  data and does not call a server deletion endpoint. The new page states this
  explicitly and provides the published support email request path.
- Web browser site-data clearing removes local copies only.

These pages do not add an automated deletion endpoint or implement an operator
workflow. The owner must actually process requests, verify ownership, locate
practice records, remove the requested data and honour the stated retention
schedule. The native deletion flow still needs server-request integration before
claiming end-to-end in-app account deletion.

## Publication

The local web container is separate from the public server. Rebuild and deploy
the web application, then verify both public
URLs return readable HTML without login before entering them in Play Console.
No public deployment was performed as part of creating these pages.

Verification: production web build (including lint/type checks) and targeted ESLint
passed. The rebuilt local web container is healthy. Both local routes return HTTP
200; the response HTML contains the heading, canonical link, Telugu summary,
cross-links without a login or catalogue load. Public URLs
were checked on 12 September 2026 and both returned HTTP 404. Interactive browser
verification was unavailable in this session.

After completing the content, the production build passed again and the local
container is healthy. HTTP HTML checks found 838 words / 10 sections on Privacy
Policy and 708 words / 6 sections on Account Deletion, including Telugu summaries.
Both routes return 200 with no draft text, indexed metadata, cross-links and the
published contact. The deletion mailto subject/body were decoded and checked;
no request was sent. Public URLs still returned 404 on this check.

Google Play references checked for this task:

- [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en-GB)
