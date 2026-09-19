# Stratum Field Lab

A study platform for **Geology, Earth Sciences and GIS**, built from the
`App_Ideation.pdf` brief.

## Run it

No build step and no dependencies. Serve the folder over HTTP (ES modules do
not load from `file://`):

```bash
cd apps/stratum
python3 -m http.server 8777
# open http://localhost:8777/
```

## The Field Lab (3D)

Four interactive WebGL instruments, written against the raw WebGL2 API with
**no 3D library**. Drag to rotate, scroll to zoom, click to inspect.

| Instrument | What it does |
|---|---|
| **Tectonic globe** | 14 plate boundaries coloured by kind, 14 real earthquakes at their published epicentres, coastlines and graticule. Click a boundary or epicentre for detail; jump-to-epicentre list flies the camera. |
| **Core sample** | A composite peninsular-India section, 7 units over 2.5 Ga. Click a band in the core or in the graphic log; GPU colour-ID picking keeps the two in sync. |
| **Terrain** | One procedural DEM rendered five ways (hillshade, elevation, slope, aspect, contours) to show that one measured surface yields many raster products. Mode switching happens in the fragment shader. |
| **Crystals** | The seven crystal systems as idealised habits, including a quartz prism with pyramidal terminations. |

Why no Three.js: this sandbox blocks CDN egress, so a library could only have
been shipped untested. Hand-written WebGL is verifiable here, adds zero bytes
of dependency, keeps the app fully offline, and gives direct shader control.

**Engineering notes**
- `gl.js` is a ~380-line engine: mat4/vec3 math, program and VAO helpers,
  geometry builders, an orbit camera (pointer + wheel + pinch), and a
  colour-ID picker.
- Scenes idle when scrolled off screen (`IntersectionObserver`) or when the
  tab is hidden, and honour `prefers-reduced-motion` by dropping auto-rotation.
- Every scene is torn down on navigation through a teardown registry, so
  WebGL contexts are released rather than leaked. Verified: zero canvases
  remain after walking all 15 routes.
- The canvas is absolutely positioned so it can never feed its own size back
  into layout.
- Scene colours are read from the CSS custom properties, so 3D follows the
  light/dark theme with the rest of the app.
- Falls back to a plain message if WebGL is unavailable; nothing else breaks.

## What is implemented

Every screen is functional and driven by real state, not mockups.

| Brief item | Status |
|---|---|
| Gamified crossword and puzzles | Generated grid, new one daily, hints cost coins, across/down clue navigation |
| Increased difficulty levels | Adaptive difficulty from rolling accuracy |
| Daily challenges, streaks, rewards | Streak tracking, XP, coins, 8 badges, levels |
| MCQ quizzes + leaderboard | 31-question bank, explanations, leaderboard |
| Adaptive learning | `adaptiveLevel()` reads the last 6 answers per topic |
| Timed practice sessions | 30s per question, higher XP, Pro-gated |
| Blogs | 6 articles with mid-article comprehension checkpoints |
| Interactive content | Inline quizzes inside articles |
| Premium blogs | 3 of 6 gated behind Pro |
| Free resources + affiliate links | 12 curated resources, affiliate slot, user ratings |
| Curated study paths | Filter by level (beginner/intermediate/advanced) |
| User reviews and ratings | Per-resource 1-5 star rating, persisted |
| Subject-specific chatbot | Retrieval over a 16-entry knowledge base, runs locally |
| Voice integration | Web Speech API for input and output, degrades gracefully |
| Recommendation engine | Dashboard + mentor point at your weakest topic |
| Discussion forums | Threads and replies, seeded + user-authored |
| Career resources / job board | 8 roles, filter by seniority |
| Schedule a 1-on-1 call | Slot picker, Premium-gated |
| Interactive glossary and study aids | 40 terms, search, filter |
| Flashcards | Leitner box spaced repetition (5 boxes) |
| Progress reports and analytics | XP-per-day chart, accuracy by topic, mastery table, shareable report |
| Onboarding | 4-step first-run walkthrough |
| Freemium / tiered subscription | Free / Pro / Premium / Lifetime, flags applied live |
| Google AdSense placement | Ad slot rendered for Free tier only |
| Referral programme | Generated referral code |
| Offline mode | Zero network calls after load; "save offline" list |
| Social sharing | Copy report card and quiz result |
| 3D interactive lab | Four WebGL instruments, hand-written, no library |

### Deliberately not built

- **Real payments.** Plan switching flips local flags. No processor is wired up.
- **A real backend.** No accounts, no sync, no server. State is `localStorage`,
  scoped to one browser. The leaderboard is a sample cohort with your real
  score ranked into it, labelled as such in the UI.
- **A generative LLM chatbot.** The mentor retrieves from a fixed knowledge
  base and says so when a question is out of scope, rather than inventing
  answers. Swapping in an API is a change to `mentorReply()` in `core.js`.
- **Push notifications, certifications, video, merchandise, data
  monetisation** and the other later items in the brief.

## Architecture

```
index.html   shell, nav, hash router, onboarding
styles.css   design tokens, both themes
core.js      state, persistence, XP/streak/badges, crossword generator, mentor
data.js      content: questions, glossary, articles, resources, jobs, KB
views.js     one exported function per screen
gl.js        WebGL2 engine: math, programs, meshes, orbit camera, picking
geodata.js   coastlines, plate boundaries, earthquakes, strat column, crystals
scenes.js    the four 3D instruments
```

Coastlines and plate boundaries are generalised outlines authored for this
app, good to roughly a degree. They teach shape and relationship; they are
not survey data. Earthquakes are real events with published epicentres.

State lives in a single `S` object persisted to `localStorage` under
`stratum.v1`; every read and write is wrapped so private-mode browsers fall
back to in-memory state instead of throwing.

## Design notes

- Palette drawn from mineral pigments: azurite, limonite, malachite, cinnabar.
  Neutrals carry a slate bias toward the accent rather than being pure grey.
- The three topic/series colours are **validated**, not eyeballed: they pass a
  six-check colour audit (lightness band, chroma floor, CVD separation,
  normal-vision floor, contrast) against both the light and dark surfaces.
  Dark-mode steps are separately chosen, not flipped.
- Topic identity is never carried by colour alone: every swatch is paired with
  a text label.
- Type: Archivo (display), Public Sans (body), IBM Plex Mono (data and labels).
- Full light and dark themes, following the OS by default with a manual
  override. Responsive to 390px, where the rail becomes a bottom tab bar.
