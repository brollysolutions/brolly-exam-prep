# Website visual refresh

2026-09-08, branch `web`.

The user requested the visual style of https://brollyexamprep.com/ with all
existing application features preserved. The reference was inspected in the
browser. This is a presentation change to the existing Next.js website.

Before: cream surfaces, Inter/Playfair typography, ink/gold accents and a
dashboard home with daily target, progress, tests, updates and study shortcuts.
After: white/light-gray surfaces, Plus Jakarta Sans typography, lemon-yellow
accents, rounded cards and a softly highlighted home area. The original home
content, navigation labels, routes, forms and actions are retained. Visual
variance/motion/density: 3/2/4. Existing shadcn controls remain in use.

Implementation is confined to the website theme, root body styling, font CSS,
and `apps/web/app/brolly-theme.css`. No component logic, data stores, exam logic,
API code, translations, mobile source or shared tokens changed. Exam answer,
marked, error and success states retain their distinct semantic treatments.
Metadata, service worker, dependency manifests and lockfile are unchanged.

Fonts are self-hosted from Google Fonts' Plus Jakarta Sans distribution
(400/500/600/700/800); the SIL Open Font License is included at
`apps/web/public/fonts/PlusJakartaSans-OFL.txt`. Existing Telugu fonts and the
application logo are retained. No reference-site courses, statistics, booking,
search, registration or other new functionality was added.

Validation: seven existing migration tests, lint and TypeScript checks passed.
Eight existing routes were checked at 1280, 390 and 320 pixels with no horizontal
overflow; home, tests, study and eligibility were also checked in Telugu.
All four test filters were exercised. An isolated browser context verified
answer selection and the 200-question mobile palette without altering the
user's saved session. Baseline source hashes confirmed functional components,
data, mobile and backend files remained unchanged.
