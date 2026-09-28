# Candidate Sourcing Agent

Turns a job description into a ranked, explainable candidate shortlist, sourced from a talent network and live GitHub data through replaceable discovery, enrichment and evidence adapters.

```text
Sign In -> Job Description -> Candidate Persona -> Source Planning -> Discovery (Talent Network + GitHub)
  -> Identity Resolution -> Enrichment -> GitHub Evidence -> Match Score -> Ranked Shortlist -> Candidate Detail
  -> Saved Search
```

## Quick start

Requirements: Node.js 20.19 or newer and npm 10.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # add OPENAI_API_KEY and GITHUB_TOKEN for the full experience
npm run dev
```

`npm run dev` starts three processes:

| Process        | URL                   | Purpose                                                     |
| -------------- | --------------------- | ----------------------------------------------------------- |
| Talent network | http://localhost:3001 | JSON Server serving the sample pool in `mock/db.json`       |
| API            | http://localhost:4000 | Express API, adapters and scoring. Restarts on `.env` edits |
| Web            | http://localhost:3000 | React app, proxies `/api` to the API                        |

Open http://localhost:3000. The sign-in form is prefilled with the workspace account below.

### Scripts

| Command                                           | What it does                                |
| ------------------------------------------------- | ------------------------------------------- |
| `npm run dev`                                     | Talent network, API and web together        |
| `npm run dev:mock`                                | Talent network only                         |
| `npm run check`                                   | Typecheck, lint, format check and all tests |
| `npm run typecheck` / `npm run lint` / `npm test` | Individual checks                           |
| `npm run format`                                  | Format the codebase with Prettier           |
| `npm run build`                                   | Production build of the web app             |

## Demo authentication

This is **demo authentication**, not production security. The product UI does not mention it; this section documents it for developers.

```text
Email: demo@candidate.local
Password: Demo@123
```

These credentials are intentionally public and exist only for the POC. The sign-in form is prefilled with them.

- A dedicated sign-in page is shown before the application shell
- `POST /api/auth/login` validates the fixed credentials on the API and returns a random session token that expires after 60 minutes
- Sessions are held in API memory, so restarting the API signs everyone out
- The web app keeps the session in `sessionStorage`, protects every application route, returns the user to the page they requested after sign in, and signs out on expiry or on any `401`
- Sign out calls `POST /api/auth/logout` and clears cached data
- Everything lives in `apps/api/src/modules/auth` and `apps/web/src/features/auth`, so a real provider can replace it without touching feature code

No OAuth, registration, password reset, MFA or user database.

## Configuration

All configuration is optional. Without any `.env` the product runs on the deterministic AI fallback and unauthenticated GitHub (60 requests per hour). The top bar shows the state of every service.

`apps/api/.env`:

| Variable                 | Default                  | Purpose                                                                                                        |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`         | empty                    | Enables OpenAI for JD analysis, embeddings and match explanations                                              |
| `GITHUB_TOKEN`           | empty                    | 5,000 GitHub requests per hour instead of 60. Use a fine-grained token with public repository read access only |
| `PORT`                   | `4000`                   | API port                                                                                                       |
| `OPENAI_MODEL`           | `gpt-4.1-mini`           | Chat model for analysis and explanations                                                                       |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model for semantic relevance                                                                         |
| `MOCK_TALENT_URL`        | `http://localhost:3001`  | Talent network base URL                                                                                        |
| `DATA_DIR`               | `apps/api/data`          | Where saved searches are stored                                                                                |
| `GITHUB_PROFILE_MAP`     | empty                    | Explicit opt-in mapping of sample profiles to real GitHub users, for example `mt-1001:octocat`                 |

Secrets stay in the API. The browser never receives a key or token. `.env` files and `apps/api/data` are git-ignored.

### GitHub

GitHub is used for two separate capabilities through one shared, cached client (REST API version `2026-03-10`):

- **Discovery.** For technical roles, GitHub user search finds real public developers. The persona's primary language (explicit, or implied by frameworks such as React or Django) and location become search qualifiers, and location widens from city to aliases to country when results are thin. Each search costs 1 search request plus 2 core requests per profile. Non-technical roles skip GitHub, and the source plan says why.
- **Evidence.** Candidates with a real GitHub account get live evidence: repositories, languages, activity in the last 90 days, stars and corroborated persona skills. Profiles found through search are already cached, so evidence costs no extra requests.
- GitHub profiles have no employment history. Relevant experience is then **estimated** from the oldest owned repository, capped at 70% credit and labelled "est." in the UI.
- Talent network profiles are sample data with sample GitHub evidence from `mock/db.json`, labelled "Sample". A real account is only associated with a sample profile through `GITHUB_PROFILE_MAP`.
- Rate limits are handled as GitHub documents them: `x-ratelimit-remaining: 0` reports the reset time, `retry-after` reports a secondary limit, and a `401` points to `GITHUB_TOKEN`. If GitHub search fails the run continues with the other sources and shows a warning; if an evidence lookup fails, that evidence is excluded from scoring rather than scored as zero.
- The top bar reads the remaining quota from `/rate_limit`, which does not count against the limit.

### Saved searches

Every completed run is saved automatically to `apps/api/data/sourcing-runs.json` (newest 50, written atomically) and survives restarts. The **Saved searches** page lists them with top match, strong matches and sources, and supports filtering, reopening, running again with fresh data, and deleting. The sidebar shows the most recent ones.

## Architecture

External providers sit behind adapters, so business logic never depends on one vendor.

```text
Web (React)
  |
API (Express)
  |
Source Planner              decides which providers run and with which query
  |
  +-- MockTalentAdapter          DISCOVER + ENRICH   (talent network, JSON Server)
  +-- GitHubTalentAdapter        DISCOVER            (GitHub user search, technical roles only)
  +-- GitHubEvidenceAdapter      EVIDENCE            (GitHub REST, live)
  +-- MockGitHubEvidenceAdapter  EVIDENCE            (sample evidence for sample profiles)
  +-- OpenAIAdapter              ANALYZE + EMBEDDING (with deterministic fallback)
  |
Identity Resolution         union-find over email, profile URL, GitHub handle, name + company
  |
Candidate Normalization     canonical skills, merged experience, field provenance
  |
Matching Engine             deterministic scoring policy
  |
Ranked Candidates  ->  Run Store (saved searches)
```

- **Discovery, enrichment and evidence are separate capabilities.** The planner picks adapters by capability and runs discovery sources in parallel. Adding a provider such as PDL, Coresignal, Naukri, Greenhouse or Lever means adding an adapter and registering it in `apps/api/src/server.ts`. Matching and UI stay unchanged.
- **AI assists, it does not decide.** AI extracts the persona (which the recruiter can edit), provides embeddings for semantic relevance, and writes explanations for the top 10 candidates. The final score is computed deterministically.
- **Graceful degradation.** Each AI call falls back to the deterministic adapter on failure. A failed discovery source, enrichment or evidence step is marked failed or partial and the run continues. The source plan on the results page shows the status, detail and duration of every step.
- **Provenance.** Every candidate keeps its source records (discovery and enrichment), per-field provenance and per-skill source record ids.

### Deterministic fallback

When `OPENAI_API_KEY` is not set or OpenAI fails:

- JD analysis uses a rule-based parser (sections, years, seniority, location, work mode and a skill taxonomy)
- Semantic relevance uses feature-hashed bag-of-words vectors with boosted canonical skills
- Explanations are composed from the score breakdown

## Matching

Scoring is centralised in `apps/api/src/services/matching/scoringPolicy.ts` (policy `2026.09.2`).

| Component            | Weight | How it is scored                                                                                                                                                                                              |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must-have skills     | 30     | Share of must-have skills the candidate has                                                                                                                                                                   |
| Nice-to-have skills  | 5      | Share of nice-to-have skills                                                                                                                                                                                  |
| Relevant experience  | 25     | Years in relevant roles against the required minimum, or the typical minimum for the seniority. Slight penalty far above a stated maximum. Estimated from public activity when there is no employment history |
| Role and seniority   | 15     | Title similarity (60%) and seniority distance (40%)                                                                                                                                                           |
| Semantic relevance   | 10     | Calibrated embedding similarity between persona and profile                                                                                                                                                   |
| Technical evidence   | 10     | Corroborated skills, recent activity and repository depth from GitHub                                                                                                                                         |
| Location and context | 5      | Same city, same country, relocation or remote fit                                                                                                                                                             |

Components that do not apply (no location requirement, non-technical role, evidence that could not be retrieved) are excluded, and the total is normalised over the remaining weight. The candidate drawer shows the points, weight and reasoning for every component, plus the policy version.

Tiers: strong 75+, good 55+, partial 35+, weak below 35.

## Sample data

`mock/db.json` holds the talent network sample pool, with no real contact details:

- 29 profile records: 26 people plus 3 duplicates that identity resolution merges (matched by email case, profile URL trailing slash, and name with company)
- 18 enrichment records (skills, certifications, education)
- 15 sample GitHub evidence records

The pool spans frontend, backend, full stack, data, ML, DevOps, mobile, QA, design, product and management, so any engineering JD produces strong, medium and weak matches. The product never ships a default JD. Sample JDs exist only in API test fixtures.

## UI and design system

A dark navigation shell with a light working surface, built on Ant Design 6 components with a custom shell and component kit.

- **Tokens:** `apps/web/src/theme/tokens.ts` is the single palette (indigo `#4F46E5` primary on slate neutrals). `antdTheme.tsx` maps it to Ant Design tokens and shared defaults: the lucide chevron for every select, outlined tags, drawer close icon. `styles.css` mirrors the values for Tailwind.
- **Layering:** Ant Design styles sit in a CSS layer below Tailwind utilities, so utilities compose without `!important`.
- **Kit** (`apps/web/src/shared/components/ui`): `Button` (flat, no shadow, with a loading spinner), `Panel`, `Pill`, `StateMessage`, `Shimmer` skeletons, `DataTable` (scoped table theme), `SkillSelect` (primary-coloured chips), `ScoreRing`, `Avatar` and a GitHub mark.
- **Shell:** a custom collapsible sidebar with saved and recent searches, a top bar with breadcrumbs, service status and account menu, and an off-canvas drawer on mobile.
- **Icons and type:** lucide-react icons and Inter.
- **States:** shape-matched skeletons, a staged progress view while sourcing, and empty, error and not-found states throughout.

UI forms use Ant Design Form rules, custom validators and field dependencies. Runtime validation at HTTP, provider and AI boundaries uses small type guards in `apps/api/src/shared/guards.ts`.

## Stack

- **Web:** React 19, TypeScript, Rsbuild, Ant Design 6, Tailwind CSS 4, React Router 7, TanStack Query 5, lucide-react
- **API:** Node.js, Express 5, TypeScript (run with tsx)
- **Data and integrations:** JSON Server (talent network), GitHub REST, OpenAI REST
- **Shared:** `packages/contracts` holds the TypeScript contracts used by both web and API
- **Quality:** Vitest, React Testing Library, ESLint with type-aware typescript-eslint, Prettier

### Editor setup

`.vscode/settings.json` formats on save with Prettier and applies ESLint fixes on save. `.vscode/extensions.json` recommends the Prettier, ESLint and Tailwind CSS extensions. `.prettierrc` and `.editorconfig` define the code style (2 spaces, single quotes, 120 columns).

## Project structure

```text
apps/
  api/src/
    adapters/
      ai/            OpenAI adapter, deterministic fallback (JD parser, hashed embeddings)
      evidence/      live GitHub and sample GitHub evidence adapters
      github/        shared GitHub REST client: versioning, caching, rate limit handling
      sources/       talent network and GitHub discovery adapters
      types.ts       adapter capabilities and provider-agnostic records
    config/          environment loading
    modules/         HTTP routes: auth, job-analysis, sourcing, system
    services/
      ai/            primary and fallback orchestration, semantic relevance
      candidates/    identity resolution, normalization, location, experience duration
      evidence/      live or sample evidence selection and skill corroboration
      job-analysis/  persona normalisation and parsing
      matching/      scoring policy, match engine, explanations, title and seniority rules
      skills/        skill taxonomy and free-text skill detection
      sourcing/      source planner, sourcing pipeline and run store
    shared/          HTTP errors, fetch helper, guards
  web/src/
    app/             providers, routes, shell (sidebar, top bar, service status)
    features/
      auth/          session, route guard, sign-in page
      job-analysis/  JD composer and editable persona
      sourcing/      new search, saved searches, progress, pipeline and run metrics
      candidates/    results page, table, filters, detail drawer
    shared/          API client, formatting, hooks, component kit
    theme/           design tokens and Ant Design configuration
packages/contracts/  shared TypeScript contracts
mock/db.json         talent network sample data
```

## API

| Method   | Path                        | Auth   | Purpose                                |
| -------- | --------------------------- | ------ | -------------------------------------- |
| `POST`   | `/api/auth/login`           | No     | Sign in                                |
| `POST`   | `/api/auth/logout`          | Bearer | Sign out                               |
| `GET`    | `/api/auth/session`         | Bearer | Current session                        |
| `GET`    | `/api/system/status`        | Bearer | Service status for the UI              |
| `POST`   | `/api/job-analysis`         | Bearer | JD to candidate persona                |
| `POST`   | `/api/sourcing/runs`        | Bearer | Run the sourcing pipeline and save it  |
| `GET`    | `/api/sourcing/runs`        | Bearer | Saved searches, newest first           |
| `GET`    | `/api/sourcing/runs/:runId` | Bearer | A saved search with its full shortlist |
| `DELETE` | `/api/sourcing/runs/:runId` | Bearer | Delete a saved search                  |

## Known limitations

- Sessions are in memory and reset when the API restarts; saved searches persist on disk
- JSON Server has no search endpoint, so the talent network adapter emulates a provider keyword search over the collection
- GitHub search allows 30 requests per minute with a token and returns public profile data only, so GitHub candidates have no employment history or contact details
- The deterministic fallback is intentionally simple. Configure OpenAI for better JD understanding and semantic relevance
