# Beat22 - Beat Discovery App

A React Native (Expo) app + Node.js/Express backend for discovering music
beats via search and a personalized, explainable recommendation engine.

---

## 1. Project Setup

### Prerequisites
- [Bun](https://bun.sh) >= 1.0
- Expo Go app on your phone (easiest way to run the mobile app), or an
  Android/iOS simulator

### Backend

```bash
cd backend
bun install
bun run dev        # bun --watch, auto-restarts on changes
# or
bun start
```

The API runs on `http://localhost:4000` by default (override with `PORT`
env var). Health check: `GET http://localhost:4000/health`.

### Mobile App

```bash
cd mobile
bun install
bun start           # opens Expo dev tools / QR code
```

**Important - connecting the app to the backend:**
Copy `mobile/.env.example` to `mobile/.env` and set `EXPO_PUBLIC_API_URL`.
`localhost` only works when running the **web** target on the same
machine as the backend. For a physical device via Expo Go or an Android
emulator, use:
- Your machine's LAN IP, e.g. `http://192.168.1.23:4000/api` (find it
  with `ipconfig` / `ifconfig`), or
- A deployed backend URL (see "Deployment" below).

Both devices (phone + laptop) must be on the same Wi-Fi network for the
LAN IP approach to work.

### Deployment

**Backend** - it's a stateless (in-memory-state) Express app, so it
deploys as a plain Node service or a container:
- **Render (recommended, has a ready-made blueprint)**: push this repo
  to GitHub, then in Render choose "New → Blueprint" and point it at
  the repo - `render.yaml` at the project root already defines the
  service (root dir `backend/`, build `bun install`, start `bun start`,
  health check `/health`). Render will give you a URL like
  `https://beat22-backend.onrender.com`.
- **Docker (Railway, Fly.io, any VM)**: `backend/Dockerfile` is ready -
  `docker build -t beat22-backend backend/ && docker run -p 4000:4000 beat22-backend`.

**Mobile app** - two ways to make it shareable without an app store:
1. **Expo web export (a real shareable link)**: `cd mobile && bun run
   build:web` produces a static site in `mobile/dist/`. Deploy that
   folder to Vercel (a `vercel.json` is already included - just import
   the `mobile/` folder as a Vercel project) or Netlify. Set
   `EXPO_PUBLIC_API_URL` to your deployed backend URL as an environment
   variable in the hosting dashboard before building.
2. **Expo Go (fastest for the screen recording / live device testing)**:
   `bun start` in `mobile/` and scan the QR code with Expo Go. Set
   `EXPO_PUBLIC_API_URL` in a `.env` file (copy `.env.example`) to your
   LAN IP or deployed backend URL first.

---

## 2. Project Architecture

```
beat22/
├── backend/
│   ├── data/beats.json              # provided dataset
│   ├── Dockerfile                   # container build for deployment
│   ├── .dockerignore
│   └── src/
│       ├── server.js                # entry point
│       ├── app.js                   # express app, middleware, route mounting
│       ├── routes/                  # thin HTTP layer (beats, search, recommendations)
│       ├── services/                # all business logic lives here
│       │   ├── beatStore.js         # in-memory dataset loader/accessor
│       │   ├── searchService.js     # keyword + NLP-expanded search & scoring
│       │   ├── interactionService.js# per-user search/view history tracking
│       │   ├── embeddingService.js  # TF-IDF vectors + cosine similarity
│       │   └── recommendationService.js  # the recommendation engine
│       ├── utils/textUtils.js       # tokenizing, jaccard similarity, NLP synonym map
│       └── middleware/errorHandler.js
├── render.yaml                      # Render deployment blueprint (backend)
├── mobile/
│   ├── App.js                       # navigation container
│   ├── vercel.json                  # static hosting config for the web export
│   ├── .env.example                 # EXPO_PUBLIC_API_URL template
│   └── src/
│       ├── screens/                 # HomeScreen, BeatDetailsScreen
│       ├── components/              # BeatCard, SearchBar, Loading/Empty/ErrorState
│       ├── api/client.js            # axios instance + typed API calls
│       ├── hooks/useDebouncedValue.js
│       ├── utils/userId.js          # anonymous per-device id (AsyncStorage)
│       └── theme/theme.js           # design tokens + gradients
├── AGENTS.md                        # AI-assistance transparency doc
└── README.md
```

**Design principle:** routes are intentionally thin (parse request →
call a service → shape response). All logic that could plausibly be
unit-tested independently of HTTP lives in `services/`. This keeps the
codebase easy to navigate and means the recommendation/search logic
could be reused (e.g. in a batch job or CLI) without touching Express.

### Why no database?
The dataset is a static 100-item JSON file and the assignment doesn't
call for persistence beyond a session. An in-memory `BeatStore` (loaded
once at boot) keeps things simple and fast. `interactionService.js`
similarly holds per-user history in memory, keyed by an anonymous id
generated client-side. The trade-off is explicit: **restarting the
backend clears everyone's interaction history.** In a production
version, this would move to Redis (for hot interaction history) and
Postgres (for the beat catalog) - the service interfaces were written
so that swap wouldn't require touching route handlers.

---

## 3. API Documentation

Base URL: `http://localhost:4000/api`

All endpoints accept an optional `x-user-id` request header (an
anonymous, client-generated id). When present, it's used to record
search/view interactions for personalized recommendations.

### `GET /beats`
Returns every beat in the dataset.
```json
{ "data": [ { "id": 1, "title": "Electric Storm", "producer": "Atlas", "...": "..." } ] }
```

### `GET /beats/meta`
Returns the distinct genres and moods present in the dataset (useful
for building filter UIs).
```json
{ "genres": ["Hip Hop", "Trap", "..."], "moods": ["Happy", "Dark", "..."] }
```

### `GET /beats/:id`
Returns full details for one beat. Also records a "view" event for the
requesting user (if `x-user-id` is sent) for the recommendation engine.
- `404` if the id doesn't exist.

### `GET /search?q=<query>`
Searches across title, producer, genre, mood, tags, and description.
Also supports natural-language-ish queries (see below). Records a
"search" event for the requesting user.
```json
{ "data": [...], "query": "dark travis scott type beat", "count": 4 }
```
- `400` if `q` is missing/empty.

### `GET /beats/:id/similar?limit=5`
Embedding-based "more like this" - returns beats most semantically
similar to the given beat, independent of any user profile. Powers the
"Similar Beats" section on the Beat Details screen.
```json
{ "data": [ { "id": 11, "title": "Solar Vibes", "...": "...", "similarity": 0.50 } ], "count": 5 }
```

### `GET /recommendations?limit=10`
Returns personalized recommendations for the requesting user (via
`x-user-id`), or trending/popular beats for anonymous/new users
(cold start).
```json
{
  "data": [
    {
      "id": 34,
      "title": "Electric Lights",
      "...": "...",
      "reason": "You've shown interest in Trap, and you tend to like Dreamy beats...",
      "strategy": "personalized"
    }
  ],
  "strategy": "personalized",
  "count": 10
}
```

---

## 4. Search Implementation

Implemented in `backend/src/services/searchService.js`. Rather than a
single substring match, search is **scored**, so the most relevant
beats surface first even when a query matches loosely:

| Match type | Example | Weight |
|---|---|---|
| Exact title | `"Electric Storm"` | 10 |
| Title contains | `"electric"` | 6 |
| Exact/contains producer | `"Atlas"` | 8 / 5 |
| Genre / mood token match | `"trap"`, `"dark"` | 7 |
| Tag exact match | `"808"` | 5 |
| Description substring | any leftover words | 2 |

Results are sorted by total score, tie-broken by play count.

### Natural language search (bonus, implemented)
Free-text queries like *"dark Travis Scott type beat"*, *"emotional
piano drill"*, or *"happy afro beat"* are additionally expanded via a
small hand-written synonym/association map
(`backend/src/utils/textUtils.js::ASSOCIATIONS`) that maps:
- artist/producer-style references → the closest genre+mood+tag signals
  present in the dataset (e.g. "Travis Scott" → Trap/Melodic Trap,
  Dark mood, `dark`/`synth`/`808` tags)
- descriptive/mood words → the matching structured mood + related tags

This was a deliberate choice over calling an external LLM for every
search keystroke: it's instant, free, deterministic, and fully covers
the vocabulary that actually exists in this 100-beat dataset. The
trade-off is it won't generalize to artists/vocabulary outside the map -
documented under "Future Improvements" below.

---

## 5. Recommendation Implementation

This is the core of the assignment, in
`backend/src/services/recommendationService.js`.

### Strategy: content-based, explainable, session-personalized
With 100 beats and no real user accounts, collaborative filtering
("users who liked X also liked Y") doesn't have enough data to be
meaningful. Instead, the engine builds a **per-user taste profile** from
that user's own recent behavior and scores every beat against it.

**Signals captured per user** (`interactionService.js` tracks these,
keyed by an anonymous device id sent as `x-user-id`):
1. **Beats viewed** (strongest signal - explicit interest)
2. **Past searches** (expanded through the same NLP association map used
   by search, so searching "dark trap" pushes the profile toward
   Trap/Dark even before the user views anything)

**Recency weighting:** each interaction is weighted by
`0.85^index` (index 0 = most recent), so a user's taste can shift
within a session and recent behavior dominates older behavior.

### Embedding-based similarity (added on review feedback)
Alongside the heuristic genre/mood/tag/producer scoring, the engine
now builds a **TF-IDF embedding vector** for every beat
(`backend/src/services/embeddingService.js`) from its title, producer,
genre, mood, tags, and description, and computes **cosine similarity**
between:
- a beat and another beat → powers `GET /beats/:id/similar` ("Similar
  Beats" on the details screen) - pure content-based item-item
  similarity, no user profile involved.
- a beat and a user's "taste vector" (the recency-weighted average of
  the embeddings of beats they've viewed) → blended into the
  personalized recommendation score below.

**Why TF-IDF instead of calling an external embeddings API
(OpenAI/Cohere/etc.)?** This project has no configured embedding API
key, and faking that call in the code would misrepresent what's
actually running. TF-IDF + cosine similarity is a legitimate, classical
embedding technique - it turns each beat's text into a vector in a
shared vocabulary space and measures semantic closeness, which is
exactly what a neural embedding does, just without a learned encoder.
For a 100-item catalog with a modest vocabulary, this is fast,
free, fully offline, and the effect is real: `getSimilarBeats()`
correctly surfaces beats with related themes/production style even
across different genres (see the example in the code comments).
The service is written so a real neural embeddings API is a drop-in
swap later - see the comment at the top of `embeddingService.js` for
exactly where that swap would go.

**Profile → per-beat score:**
```
total = genreAffinity   × 1.00
      + moodAffinity    × 1.00
      + tagOverlapScore × 0.60
      + producerAffinity× 0.40
      + embeddingSimilarity × 2.50   (cosine similarity to the user's taste vector)
      + popularityPrior × 0.15   (plays/likes, normalized - tie-breaker & cold-start smoothing)
```
The embedding term is weighted highest because it's the signal most
likely to catch something the structured fields miss entirely (e.g. two
beats in different genres that both read as "late-night, moody drive"
beats). When it's the dominant contributor to a recommendation, the
explanation says so explicitly (see below) rather than defaulting to a
generic genre/mood explanation that wouldn't actually be true.

**Diversity guard:** at most 3 beats per genre are allowed into the
final recommendation list, so a user who viewed one Trap beat doesn't
get 10 near-identical Trap results back.

**Cold start:** brand-new users (no interaction history yet) receive
**trending** beats, ranked by a normalized blend of plays and likes.
If a returning user's personalized list is shorter than the requested
`limit` (sparse history), it's backfilled with trending beats rather
than returning a short list.

**Explanations (required by the assignment):** every recommendation
includes a `reason` string generated from *which signals actually
contributed* to that beat's score - e.g. *"You've shown interest in
Trap, and you tend to like Dark beats, and shares tags (808, dark) with
beats you've explored."* Cold-start recommendations get a straightforward
*"Trending pick - popular with other listeners (X plays, Y likes)"*.

### "Any AI-assisted recommendation strategy" (implemented)
Two things satisfy this:
1. The **embedding-based similarity** described above (TF-IDF vectors +
   cosine similarity) - a genuine content/semantic retrieval technique,
   not just keyword matching.
2. The NLP association map (also used by search) applied to a user's
   *search history*, inferring implicit genre/mood/tag preferences even
   from searches that never resulted in a view.

---

## 6. Engineering Decisions & Assumptions

- **Anonymous identity, not full auth.** The assignment doesn't call for
  login; a per-device id (generated once, stored in AsyncStorage) is
  sufficient to demonstrate personalization without over-building.
- **In-memory state everywhere.** Appropriate for a 100-item dataset and
  a take-home assignment; explicitly called out as the first thing to
  swap for a DB/cache in a real deployment (see Architecture section).
- **No external LLM/embedding API for search or recommendations.**
  Chose a deterministic, fast, zero-cost keyword/association approach
  that fully covers the given dataset's vocabulary, rather than adding
  network dependency + latency + API cost for a 100-item catalog. This
  is documented as a conscious trade-off, not an oversight.
- **Thin routes / fat services.** Business logic is unit-testable and
  reusable independent of Express.
- **Diversity cap over pure top-N.** A pure top-N-by-score list tends to
  collapse into one genre once a user shows any signal; capping avoids
  a monotone feed.

---

## 7. Future Improvements

- Swap the TF-IDF embeddings for a real neural embeddings API (e.g.
  OpenAI/Cohere/Anthropic) once an API key is available - the service
  interface (`embedText`, `cosineSimilarity`) is already shaped so this
  is a drop-in change, not a rewrite.
- Persist interaction history and the beat catalog in a real database
  (Postgres + Redis) so history survives backend restarts and scales
  beyond one process.
- Add collaborative filtering once there's a real multi-user dataset
  (e.g. matrix factorization or a simple item-item co-occurrence model
  from real listen/like events).
- Add pagination/infinite scroll for `/beats` and search results.
- Add unit tests for `searchService` and `recommendationService`
  scoring functions (pure functions, easy to test in isolation).
- Add a "why not this?" negative-feedback signal (e.g. skip/dismiss) to
  the recommendation profile, not just positive signals.
- Debounce + cancel in-flight search requests more aggressively (an
  `AbortController` per request) instead of only ignoring stale
  responses.

---

## 8. AI-Assisted Development
See [`AGENTS.md`](./AGENTS.md) for how Claude was used to build this
project, including an honest log of what's been reviewed/understood
versus what's still generated-and-not-yet-reviewed, per the submission
requirements.
