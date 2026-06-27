# Birthday Role Game — System Design

**Date:** 2026-06-27
**Status:** Approved

---

## 1. Project Overview

A web platform for a one-time in-person birthday role-playing game event with ~20 participants. Players register online, build their character before the event, then participate in 15–25 sequential live games. A TV display shows the live game state in real time. An admin controls game progression from the same web app.

---

## 2. Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS + `tokens.css` (CSS custom properties) |
| Backend / Auth | Supabase (Auth, Database, Realtime, Storage, Edge Functions) |
| Hosting | Vercel (production + staging + per-PR previews) |

### Environments

| Environment | Branch | URL |
|-------------|--------|-----|
| Production | `main` | Vercel production domain |
| Staging | `staging` | Vercel staging domain |
| PR Preview | feature branch | Auto-generated Vercel URL per PR |

### High-Level Flow

```
Next.js App (Vercel)
  ├── /                   Landing + registration
  ├── /dashboard          Player dashboard
  ├── /character          Character sheet builder
  ├── /admin              Admin panel (is_admin gated)
  └── /live               Live TV display (public, realtime)
        │
        ▼
  Supabase
    ├── Auth              Email/password + email confirmation
    ├── Database          All game + player data
    ├── Realtime          Live screen instant updates
    ├── Storage           Game instruction images
    └── Edge Functions    Email reminders for incomplete characters
```

---

## 3. Database Schema

### `event` (single row)
```sql
id              uuid PK
name            text
event_start_at  timestamptz   -- drives countdown + auto-locks character editing
created_at      timestamptz
```

### `profiles` (extends auth.users)
```sql
id        uuid PK FK auth.users
email     text
is_admin  boolean default false   -- set manually in DB once, never via app
created_at timestamptz
```

### `trait_options`
```sql
id    uuid PK
name  text
type  enum(positive, negative)
```

### `background_options`
```sql
id    uuid PK
name  text
```

### `players`
```sql
id                uuid PK
user_id           uuid FK profiles
character_name    text
creature          text              -- free text (e.g. "human", "ghost")
positive_trait_1  uuid FK trait_options
positive_trait_2  uuid FK trait_options
negative_trait_1  uuid FK trait_options
negative_trait_2  uuid FK trait_options
background        uuid FK background_options
is_complete       boolean default false
created_at        timestamptz
updated_at        timestamptz
```

Character editing is locked automatically when `now() >= event.event_start_at`.

### `games`
```sql
id               uuid PK
title            text
order_index      integer
status           enum(pending, active, finished)
current_step_id  uuid FK game_steps nullable  -- which step is live right now
team_size        integer          -- 1 = solo, 2+ = team
game_type        enum(strongness, mental, cooperation, velocity, deception)
```

The admin advances a game by setting `current_step_id` to the next step in `order_index`. The `/live` page subscribes to changes on `games.current_step_id` and renders the matching step component. `status = active` means a step is currently shown; `status = finished` means all steps are done.

### `game_steps`
```sql
id         uuid PK
game_id    uuid FK games
step_type  enum(instructions, status, results)
order_index integer
content    jsonb              -- flexible payload per step type (see below)
```

**Content payloads by step type:**

- `instructions`: `{ "text": "...", "images": ["url1", "url2"] }`
- `status`: `{ "label": "..." }` — player statuses live in `game_status_entries`
- `results`: `{ "label": "..." }` — points live in `leaderboard`

### `game_status_entries`
```sql
id         uuid PK
game_id    uuid FK games
player_id  uuid FK players
status     text               -- e.g. "alive", "eliminated", "winner"
updated_at timestamptz        -- Realtime fires on update
```

### `leaderboard`
```sql
id         uuid PK
game_id    uuid FK games
player_id  uuid FK players
points     integer
```

Global leaderboard = `SUM(points)` per player across all games.

---

## 4. Page Structure & Access Control

### `/` — Landing + Registration
- Public
- Shows event name, countdown to `event_start_at`
- Registration form: email + password
- Email confirmation required before any protected route is accessible

### `/dashboard` — Player Dashboard
- Auth required
- Shows: character completion status + reminder banner if incomplete
- Shows: global leaderboard position
- Shows: current game status if event is live

### `/character` — Character Sheet Builder
- Auth required
- Fields: character name, creature (free text), 2 positive traits, 2 negative traits, 1 background
- Traits and backgrounds selected from predefined lists (`trait_options`, `background_options`)
- Read-only when `now() >= event.event_start_at`

### `/admin` — Admin Panel
- Auth required + `is_admin = true`
- Game list with status controls (advance pending → instructions → active → finished)
- Per-active-game: player status editor (writes to `game_status_entries` → Realtime fires)
- Points entry per player per game (writes to `leaderboard`)

### `/live` — Live TV Display
- Public, no login required
- Before `event_start_at`: full-screen countdown
- After `event_start_at`: renders current active game step via `<GameStep>` composition
- Supabase Realtime subscription — updates instantly when admin writes

---

## 5. Game Step Composition

Every game renders its steps sequentially via a shared composition interface:

```typescript
interface GameStepProps {
  game: Game
  step: GameStep
  players: Player[]
  isAdmin: boolean   // same component, different render branch
}
```

**Step components:**

| Component | Live View | Admin View |
|-----------|-----------|------------|
| `InstructionsStep` | Rules text + image carousel | (read only) |
| `StatusStep` | Player status board (realtime) | Editable status table |
| `ResultsStep` | Points + leaderboard snapshot | Points entry form |
| `TeamArrangementStep` | *(placeholder — future)* | *(placeholder — future)* |

Adding a new step type = one new component + one new enum value. No other changes required.

The `/live` page iterates `game_steps ORDER BY order_index` and renders the component matching `step.step_type`. The admin panel mirrors this, passing `isAdmin: true`.

---

## 6. Design Token System

All visual decisions live in a single `src/styles/tokens.css` file as CSS custom properties:

```css
:root {
  /* Colors */
  --color-bg-primary: ...;
  --color-bg-secondary: ...;
  --color-text-primary: ...;
  --color-text-secondary: ...;
  --color-accent: ...;
  --color-danger: ...;
  --color-success: ...;

  /* Typography */
  --font-family-base: ...;
  --font-size-xs: ...;
  --font-size-sm: ...;
  --font-size-md: ...;
  --font-size-lg: ...;
  --font-size-xl: ...;
  --font-size-2xl: ...;

  /* Spacing & Shape */
  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;
  --shadow-sm: ...;
  --shadow-md: ...;
}
```

No hardcoded colors, font sizes, or border radii anywhere in component files. Tailwind is configured to reference these variables. A full visual overhaul = editing `tokens.css` only.

---

## 7. Email Reminders

A Supabase Edge Function runs on a schedule before the event. It queries players where `is_complete = false` and sends a reminder email via the Supabase SMTP integration. Triggered manually or via cron. No external email service needed initially.

---

## 8. Testing Policy

- **Unit tests**: all business logic (point calculations, character validation, step ordering, access control checks)
- **Integration tests**: Supabase interactions against a dedicated test project (no DB mocking)
- **Smoke tests**: run against staging before any `staging → main` merge

---

## 9. Sprint Breakdown

### Milestone 1 — Foundation
| Release | Scope | Role | Parallel with |
|---------|-------|------|---------------|
| 1.1 | Supabase schema + seed data (traits, backgrounds) | Backend | 1.2 |
| 1.2 | Next.js scaffold + design tokens + routing skeleton | Frontend | 1.1 |
| 1.3 | Auth: register, email confirm, login, route guards | Fullstack | — |

### Milestone 2 — Player Experience
| Release | Scope | Role | Parallel with |
|---------|-------|------|---------------|
| 2.1 | Character builder UI + save to DB | Fullstack | 2.2 |
| 2.2 | Email reminder Edge Function | Backend | 2.1 |
| 2.3 | Player dashboard (status + leaderboard position) | Frontend | — |

### Milestone 3 — Admin & Live Engine
| Release | Scope | Role | Parallel with |
|---------|-------|------|---------------|
| 3.1 | Admin panel scaffold + game CRUD + status controls | Fullstack | 3.2 |
| 3.2 | Game step composition engine + step components | Frontend | 3.1 |
| 3.3 | Realtime subscriptions + `/live` page | Fullstack | — |
| 3.4 | Global leaderboard (admin entry + player view) | Fullstack | — |

### Milestone 4 — Content & Polish
| Release | Scope | Role | Parallel with |
|---------|-------|------|---------------|
| 4.1 | Seed all games with content + instruction images | Content/Backend | 4.2 |
| 4.2 | Countdown screen on `/live` | Frontend | 4.1 |
| 4.3 | Image upload UI for instruction steps | Fullstack | — |
| 4.4 | E2E tests + staging smoke tests | QA | — |

---

## 10. PR & Merge Workflow

1. Feature branch cut from `staging`
2. PR opened → Vercel preview URL generated automatically
3. CI runs tests on PR
4. Merge agent reviews + merges to `staging`
5. Smoke tests on staging
6. `staging → main` PR for each milestone completion → production deploy

Each release in the sprint table = one PR. Parallel releases = parallel open PRs with no overlapping file scope.
