# Birthday Role Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack web platform for a live in-person birthday role-playing game event — player registration + character creation, admin game management, and a real-time live TV display.

**Architecture:** Next.js 14 App Router on Vercel (production=`main`, staging=`staging`, per-PR previews). Supabase handles auth, database, realtime subscriptions, storage, and edge functions. Game logic is composed via interchangeable `GameStep` components. Each release ships as one feature branch → one PR → merge to `staging`.

**Tech Stack:** Next.js 14, TypeScript (strict), Tailwind CSS v3 + CSS custom properties, Supabase JS v2 (`@supabase/ssr`), Jest + React Testing Library, Playwright (E2E).

## Global Constraints

- TypeScript strict mode — no `any` anywhere
- All colors, font sizes, border-radii, shadows must use CSS custom properties from `src/styles/tokens.css` — never hardcoded in component files
- No direct Supabase calls from component bodies — use helpers from `src/lib/supabase/`
- Unit tests run via `npm run test:unit`; integration tests run via `npm run test:integration` against `TEST_SUPABASE_URL` (a separate Supabase test project — no DB mocking)
- Branch naming: `feature/M<milestone>-<release>-<slug>` (e.g. `feature/M1-1-schema`)
- Every release = one PR; parallel releases have non-overlapping file scopes
- Commit message prefixes: `feat:`, `fix:`, `test:`, `chore:`
- Node.js 20+

---

## File Structure

```
birthday_game/
├── .github/workflows/ci.yml
├── supabase/migrations/
│   ├── 001_schema.sql
│   └── 002_seed.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # Landing + registration
│   │   ├── auth/confirm/route.ts           # Email confirmation handler
│   │   ├── dashboard/page.tsx
│   │   ├── character/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx                  # Admin guard
│   │   │   └── page.tsx
│   │   └── live/page.tsx
│   ├── components/
│   │   ├── game-steps/
│   │   │   ├── GameStep.tsx               # Step dispatcher
│   │   │   ├── InstructionsStep.tsx
│   │   │   ├── StatusStep.tsx
│   │   │   ├── ResultsStep.tsx
│   │   │   └── TeamArrangementStep.tsx    # Placeholder
│   │   ├── character/CharacterForm.tsx
│   │   ├── admin/
│   │   │   ├── GameList.tsx
│   │   │   └── PlayerStatusTable.tsx
│   │   ├── live/Countdown.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Select.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                  # Browser client
│   │   │   └── server.ts                  # Server client
│   │   ├── types/database.ts              # All TypeScript types
│   │   └── utils/
│   │       ├── character.ts               # isPlayerComplete, validateTraits
│   │       ├── game-steps.ts              # getNextStep, isLastStep
│   │       └── leaderboard.ts             # computeGlobalLeaderboard
│   ├── middleware.ts
│   └── styles/
│       ├── tokens.css
│       └── globals.css
├── tests/
│   ├── setup.ts
│   ├── unit/
│   │   ├── character.test.ts
│   │   ├── game-steps.test.ts
│   │   └── leaderboard.test.ts
│   └── integration/
│       ├── auth.test.ts
│       └── character.test.ts
├── jest.unit.config.ts
├── jest.integration.config.ts
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Milestone 1 — Foundation

### Task 1 (Release 1.1): Supabase Schema + Seed Data
> **⟳ PARALLEL with Task 2** — no file overlap. Branch: `feature/M1-1-schema`

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_seed.sql`

**Interfaces:**
- Produces: all DB tables, enums, RLS policies, realtime publications, trigger for auto-profile creation

- [ ] **Step 1: Create branch**

```bash
git checkout staging 2>/dev/null || git checkout -b staging
git push -u origin staging
git checkout -b feature/M1-1-schema
```

- [ ] **Step 2: Write 001_schema.sql**

Create `supabase/migrations/001_schema.sql`:

```sql
create extension if not exists "uuid-ossp";

-- Enums
create type public.trait_type as enum ('positive', 'negative');
create type public.game_status as enum ('pending', 'active', 'finished');
create type public.step_type as enum ('instructions', 'status', 'results', 'team_arrangement');
create type public.game_type as enum ('strongness', 'mental', 'cooperation', 'velocity', 'deception');

-- Event (single row — controls countdown and character lock)
create table public.event (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  event_start_at timestamptz not null,
  created_at   timestamptz not null default now()
);

-- Profiles (extends auth.users)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile row on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trait options
create table public.trait_options (
  id   uuid primary key default uuid_generate_v4(),
  name text not null,
  type public.trait_type not null,
  constraint trait_options_name_type_unique unique (name, type)
);

-- Background options
create table public.background_options (
  id   uuid primary key default uuid_generate_v4(),
  name text not null unique
);

-- Players / characters
create table public.players (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  character_name   text,
  creature         text,
  positive_trait_1 uuid references public.trait_options(id),
  positive_trait_2 uuid references public.trait_options(id),
  negative_trait_1 uuid references public.trait_options(id),
  negative_trait_2 uuid references public.trait_options(id),
  background       uuid references public.background_options(id),
  is_complete      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint players_user_id_unique unique (user_id)
);

-- Games (current_step_id FK added after game_steps)
create table public.games (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  order_index     integer not null,
  status          public.game_status not null default 'pending',
  current_step_id uuid,
  team_size       integer not null default 1,
  game_type       public.game_type not null,
  constraint games_order_index_unique unique (order_index)
);

-- Game steps
create table public.game_steps (
  id          uuid primary key default uuid_generate_v4(),
  game_id     uuid not null references public.games(id) on delete cascade,
  step_type   public.step_type not null,
  order_index integer not null,
  content     jsonb not null default '{}',
  constraint game_steps_order_unique unique (game_id, order_index)
);

-- Back-fill FK from games to game_steps
alter table public.games
  add constraint games_current_step_id_fkey
  foreign key (current_step_id) references public.game_steps(id) on delete set null;

-- Game status entries (realtime-watched)
create table public.game_status_entries (
  id         uuid primary key default uuid_generate_v4(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  status     text not null default 'alive',
  updated_at timestamptz not null default now(),
  constraint game_status_entries_unique unique (game_id, player_id)
);

-- Leaderboard
create table public.leaderboard (
  id        uuid primary key default uuid_generate_v4(),
  game_id   uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  points    integer not null default 0,
  constraint leaderboard_unique unique (game_id, player_id)
);

-- RLS
alter table public.event                enable row level security;
alter table public.profiles             enable row level security;
alter table public.trait_options        enable row level security;
alter table public.background_options   enable row level security;
alter table public.players              enable row level security;
alter table public.games                enable row level security;
alter table public.game_steps           enable row level security;
alter table public.game_status_entries  enable row level security;
alter table public.leaderboard          enable row level security;

-- Event
create policy "event_read_all"    on public.event for select using (true);
create policy "event_write_admin" on public.event for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Profiles
create policy "profiles_read_all"    on public.profiles for select using (true);
create policy "profiles_insert_own"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- Traits / backgrounds (read-only for everyone)
create policy "trait_options_read"      on public.trait_options      for select using (true);
create policy "background_options_read" on public.background_options for select using (true);

-- Players
create policy "players_read_all"    on public.players for select using (true);
create policy "players_insert_own"  on public.players for insert with check (auth.uid() = user_id);
create policy "players_update_own"  on public.players for update using (auth.uid() = user_id);

-- Games + steps + status + leaderboard: read all, write admin only
create policy "games_read_all"    on public.games for select using (true);
create policy "games_write_admin" on public.games for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "game_steps_read_all"    on public.game_steps for select using (true);
create policy "game_steps_write_admin" on public.game_steps for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "game_status_read_all"    on public.game_status_entries for select using (true);
create policy "game_status_write_admin" on public.game_status_entries for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "leaderboard_read_all"    on public.leaderboard for select using (true);
create policy "leaderboard_write_admin" on public.leaderboard for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Enable realtime on tables that the /live page subscribes to
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_status_entries;
alter publication supabase_realtime add table public.leaderboard;
```

- [ ] **Step 3: Write 002_seed.sql**

Create `supabase/migrations/002_seed.sql`:

```sql
-- Positive traits (20)
insert into public.trait_options (name, type) values
  ('Brave', 'positive'), ('Clever', 'positive'), ('Charismatic', 'positive'),
  ('Agile', 'positive'), ('Strong', 'positive'), ('Wise', 'positive'),
  ('Lucky', 'positive'), ('Perceptive', 'positive'), ('Empathetic', 'positive'),
  ('Resourceful', 'positive'), ('Stealthy', 'positive'), ('Diplomatic', 'positive'),
  ('Creative', 'positive'), ('Resilient', 'positive'), ('Loyal', 'positive'),
  ('Precise', 'positive'), ('Energetic', 'positive'), ('Adaptable', 'positive'),
  ('Intimidating', 'positive'), ('Charming', 'positive');

-- Negative traits (20)
insert into public.trait_options (name, type) values
  ('Cowardly', 'negative'), ('Clumsy', 'negative'), ('Arrogant', 'negative'),
  ('Greedy', 'negative'), ('Impulsive', 'negative'), ('Stubborn', 'negative'),
  ('Naive', 'negative'), ('Paranoid', 'negative'), ('Lazy', 'negative'),
  ('Reckless', 'negative'), ('Jealous', 'negative'), ('Dishonest', 'negative'),
  ('Fearful', 'negative'), ('Hot-headed', 'negative'), ('Distrustful', 'negative'),
  ('Vain', 'negative'), ('Pessimistic', 'negative'), ('Forgetful', 'negative'),
  ('Indecisive', 'negative'), ('Overconfident', 'negative');

-- Backgrounds (20)
insert into public.background_options (name) values
  ('Orphan'), ('Ex-military'), ('Famous'), ('Noble'), ('Criminal'),
  ('Scholar'), ('Traveler'), ('Merchant'), ('Healer'), ('Hunter'),
  ('Sailor'), ('Farmer'), ('Monk'), ('Entertainer'), ('Detective'),
  ('Inventor'), ('Prophet'), ('Exile'), ('Spy'), ('Athlete');

-- Seed event row (update event_start_at before the event)
insert into public.event (name, event_start_at)
values ('Birthday Role Game', '2099-01-01T00:00:00Z');
```

- [ ] **Step 4: Apply migrations via Supabase MCP**

Using the Supabase MCP tool `apply_migration`, apply `001_schema.sql` first, then `002_seed.sql`. Confirm each succeeds by running `list_tables` and verifying all tables appear.

- [ ] **Step 5: Configure Supabase Auth email confirmation**

In the Supabase dashboard (project `bjzhndfzoadixicujufr`) → Authentication → Email:
- Enable "Confirm email" toggle
- Set site URL to your Vercel production URL

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema, seed data, and RLS policies"
git push -u origin feature/M1-1-schema
```

Open PR: `feature/M1-1-schema → staging`

---

### Task 2 (Release 1.2): Next.js Scaffold + Design Tokens
> **⟳ PARALLEL with Task 1** — no file overlap. Branch: `feature/M1-2-scaffold`

**Files:**
- Create: entire Next.js project structure (see File Structure above)
- Create: `src/styles/tokens.css`, `src/styles/globals.css`
- Create: `tailwind.config.ts`, `next.config.ts`, `jest.unit.config.ts`, `jest.integration.config.ts`
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Create: `src/lib/types/database.ts`
- Create: `src/lib/utils/character.ts`, `src/lib/utils/game-steps.ts`, `src/lib/utils/leaderboard.ts`
- Create: placeholder `src/app/` pages
- Create: `.github/workflows/ci.yml`
- Create: `.env.local.example`

**Interfaces:**
- Produces: runnable Next.js app, all shared types, all utility functions, test infrastructure

- [ ] **Step 1: Create branch and initialize Next.js**

```bash
git checkout staging
git checkout -b feature/M1-2-scaffold
npx create-next-app@14 . --typescript --tailwind --app --src-dir --no-import-alias --eslint --yes
```

When prompted "Would you like to use Turbopack?" → No (keep stable).

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-jest @types/jest
```

- [ ] **Step 3: Write src/styles/tokens.css**

```css
:root {
  /* Colors */
  --color-bg-primary: #0a0a14;
  --color-bg-secondary: #12121f;
  --color-bg-card: #1a1a2e;
  --color-text-primary: #e8e8f0;
  --color-text-secondary: #9090a8;
  --color-text-muted: #505060;
  --color-accent: #7c3aed;
  --color-accent-hover: #6d28d9;
  --color-danger: #dc2626;
  --color-danger-hover: #b91c1c;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-border: #2a2a3e;

  /* Typography */
  --font-family-base: 'Inter', system-ui, -apple-system, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --line-height-base: 1.5;
  --line-height-tight: 1.25;

  /* Shape */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.6);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
}
```

- [ ] **Step 4: Update src/styles/globals.css**

```css
@import './tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-family-base);
  font-size: var(--font-size-md);
  line-height: var(--line-height-base);
}
```

- [ ] **Step 5: Write tailwind.config.ts**

Replace the generated config entirely:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':    'var(--color-bg-primary)',
        'bg-secondary':  'var(--color-bg-secondary)',
        'bg-card':       'var(--color-bg-card)',
        'text-primary':  'var(--color-text-primary)',
        'text-secondary':'var(--color-text-secondary)',
        'text-muted':    'var(--color-text-muted)',
        accent:          'var(--color-accent)',
        'accent-hover':  'var(--color-accent-hover)',
        danger:          'var(--color-danger)',
        'danger-hover':  'var(--color-danger-hover)',
        success:         'var(--color-success)',
        warning:         'var(--color-warning)',
        border:          'var(--color-border)',
      },
      fontSize: {
        xs:   ['var(--font-size-xs)',  { lineHeight: 'var(--line-height-base)' }],
        sm:   ['var(--font-size-sm)',  { lineHeight: 'var(--line-height-base)' }],
        md:   ['var(--font-size-md)',  { lineHeight: 'var(--line-height-base)' }],
        lg:   ['var(--font-size-lg)',  { lineHeight: 'var(--line-height-base)' }],
        xl:   ['var(--font-size-xl)',  { lineHeight: 'var(--line-height-tight)' }],
        '2xl':['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl':['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl':['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Write src/lib/types/database.ts**

```typescript
export type TraitType = 'positive' | 'negative'
export type GameStatus = 'pending' | 'active' | 'finished'
export type StepType = 'instructions' | 'status' | 'results' | 'team_arrangement'
export type GameType = 'strongness' | 'mental' | 'cooperation' | 'velocity' | 'deception'

export interface Event {
  id: string
  name: string
  event_start_at: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  is_admin: boolean
  created_at: string
}

export interface TraitOption {
  id: string
  name: string
  type: TraitType
}

export interface BackgroundOption {
  id: string
  name: string
}

export interface Player {
  id: string
  user_id: string
  character_name: string | null
  creature: string | null
  positive_trait_1: string | null
  positive_trait_2: string | null
  negative_trait_1: string | null
  negative_trait_2: string | null
  background: string | null
  is_complete: boolean
  created_at: string
  updated_at: string
}

export interface InstructionsContent {
  text: string
  images: string[]
}

export interface StatusContent {
  label: string
}

export interface ResultsContent {
  label: string
}

export type StepContent = InstructionsContent | StatusContent | ResultsContent | Record<string, never>

export interface GameStep {
  id: string
  game_id: string
  step_type: StepType
  order_index: number
  content: StepContent
}

export interface Game {
  id: string
  title: string
  order_index: number
  status: GameStatus
  current_step_id: string | null
  team_size: number
  game_type: GameType
}

export interface GameWithSteps extends Game {
  steps: GameStep[]
}

export interface GameStatusEntry {
  id: string
  game_id: string
  player_id: string
  status: string
  updated_at: string
}

export interface LeaderboardEntry {
  id: string
  game_id: string
  player_id: string
  points: number
}

export interface GlobalLeaderboardRow {
  player_id: string
  character_name: string | null
  total_points: number
  rank: number
}
```

- [ ] **Step 7: Write utility functions**

`src/lib/utils/character.ts`:
```typescript
import type { Player } from '@/lib/types/database'

export function isPlayerComplete(player: Partial<Player>): boolean {
  return !!(
    player.character_name?.trim() &&
    player.creature?.trim() &&
    player.positive_trait_1 &&
    player.positive_trait_2 &&
    player.negative_trait_1 &&
    player.negative_trait_2 &&
    player.background
  )
}

export function validateTraitsNotDuplicate(
  trait1: string | null,
  trait2: string | null
): boolean {
  if (!trait1 || !trait2) return true
  return trait1 !== trait2
}
```

`src/lib/utils/game-steps.ts`:
```typescript
import type { GameStep } from '@/lib/types/database'

function sortedByOrder(steps: GameStep[]): GameStep[] {
  return [...steps].sort((a, b) => a.order_index - b.order_index)
}

export function getNextStep(steps: GameStep[], currentStepId: string | null): GameStep | null {
  const sorted = sortedByOrder(steps)
  if (!currentStepId) return sorted[0] ?? null
  const idx = sorted.findIndex(s => s.id === currentStepId)
  return sorted[idx + 1] ?? null
}

export function getPreviousStep(steps: GameStep[], currentStepId: string | null): GameStep | null {
  if (!currentStepId) return null
  const sorted = sortedByOrder(steps)
  const idx = sorted.findIndex(s => s.id === currentStepId)
  return idx > 0 ? sorted[idx - 1] : null
}

export function isLastStep(steps: GameStep[], currentStepId: string | null): boolean {
  if (!currentStepId || steps.length === 0) return false
  const sorted = sortedByOrder(steps)
  return sorted[sorted.length - 1].id === currentStepId
}

export function getCurrentStep(steps: GameStep[], currentStepId: string | null): GameStep | null {
  if (!currentStepId) return null
  return steps.find(s => s.id === currentStepId) ?? null
}
```

`src/lib/utils/leaderboard.ts`:
```typescript
import type { LeaderboardEntry, GlobalLeaderboardRow } from '@/lib/types/database'

export function computeGlobalLeaderboard(
  entries: LeaderboardEntry[],
  playerNames: Record<string, string | null>
): GlobalLeaderboardRow[] {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    totals.set(entry.player_id, (totals.get(entry.player_id) ?? 0) + entry.points)
  }
  return Array.from(totals.entries())
    .map(([player_id, total_points]) => ({
      player_id,
      character_name: playerNames[player_id] ?? null,
      total_points,
      rank: 0,
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .map((row, i) => ({ ...row, rank: i + 1 }))
}
```

- [ ] **Step 8: Write unit tests for utilities**

`tests/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

`tests/unit/character.test.ts`:
```typescript
import { isPlayerComplete, validateTraitsNotDuplicate } from '@/lib/utils/character'

const base = {
  character_name: 'Aria',
  creature: 'Elf',
  positive_trait_1: 'uuid-1',
  positive_trait_2: 'uuid-2',
  negative_trait_1: 'uuid-3',
  negative_trait_2: 'uuid-4',
  background: 'uuid-5',
}

describe('isPlayerComplete', () => {
  it('returns true when all fields are set', () => {
    expect(isPlayerComplete(base)).toBe(true)
  })
  it('returns false when character_name is missing', () => {
    expect(isPlayerComplete({ ...base, character_name: null })).toBe(false)
  })
  it('returns false when character_name is empty string', () => {
    expect(isPlayerComplete({ ...base, character_name: '  ' })).toBe(false)
  })
  it('returns false when any trait is missing', () => {
    expect(isPlayerComplete({ ...base, positive_trait_2: null })).toBe(false)
  })
  it('returns false when background is missing', () => {
    expect(isPlayerComplete({ ...base, background: null })).toBe(false)
  })
})

describe('validateTraitsNotDuplicate', () => {
  it('returns true when traits are different', () => {
    expect(validateTraitsNotDuplicate('uuid-1', 'uuid-2')).toBe(true)
  })
  it('returns false when traits are the same', () => {
    expect(validateTraitsNotDuplicate('uuid-1', 'uuid-1')).toBe(false)
  })
  it('returns true when either trait is null', () => {
    expect(validateTraitsNotDuplicate(null, 'uuid-1')).toBe(true)
    expect(validateTraitsNotDuplicate('uuid-1', null)).toBe(true)
  })
})
```

`tests/unit/game-steps.test.ts`:
```typescript
import { getNextStep, getPreviousStep, isLastStep, getCurrentStep } from '@/lib/utils/game-steps'
import type { GameStep } from '@/lib/types/database'

const steps: GameStep[] = [
  { id: 'a', game_id: 'g1', step_type: 'instructions', order_index: 0, content: {} },
  { id: 'b', game_id: 'g1', step_type: 'status',       order_index: 1, content: { label: 'Status' } },
  { id: 'c', game_id: 'g1', step_type: 'results',      order_index: 2, content: { label: 'Results' } },
]

describe('getNextStep', () => {
  it('returns first step when currentStepId is null', () => {
    expect(getNextStep(steps, null)?.id).toBe('a')
  })
  it('returns next step', () => {
    expect(getNextStep(steps, 'a')?.id).toBe('b')
  })
  it('returns null after last step', () => {
    expect(getNextStep(steps, 'c')).toBeNull()
  })
})

describe('getPreviousStep', () => {
  it('returns null when currentStepId is null', () => {
    expect(getPreviousStep(steps, null)).toBeNull()
  })
  it('returns null for first step', () => {
    expect(getPreviousStep(steps, 'a')).toBeNull()
  })
  it('returns previous step', () => {
    expect(getPreviousStep(steps, 'b')?.id).toBe('a')
  })
})

describe('isLastStep', () => {
  it('returns false for first step', () => {
    expect(isLastStep(steps, 'a')).toBe(false)
  })
  it('returns true for last step', () => {
    expect(isLastStep(steps, 'c')).toBe(true)
  })
  it('returns false for null', () => {
    expect(isLastStep(steps, null)).toBe(false)
  })
})

describe('getCurrentStep', () => {
  it('returns the matching step', () => {
    expect(getCurrentStep(steps, 'b')?.id).toBe('b')
  })
  it('returns null when not found', () => {
    expect(getCurrentStep(steps, 'x')).toBeNull()
  })
})
```

`tests/unit/leaderboard.test.ts`:
```typescript
import { computeGlobalLeaderboard } from '@/lib/utils/leaderboard'
import type { LeaderboardEntry } from '@/lib/types/database'

const entries: LeaderboardEntry[] = [
  { id: '1', game_id: 'g1', player_id: 'p1', points: 10 },
  { id: '2', game_id: 'g2', player_id: 'p1', points: 5 },
  { id: '3', game_id: 'g1', player_id: 'p2', points: 20 },
]

const names: Record<string, string | null> = { p1: 'Aria', p2: 'Zephyr' }

describe('computeGlobalLeaderboard', () => {
  it('sums points per player', () => {
    const result = computeGlobalLeaderboard(entries, names)
    const p1 = result.find(r => r.player_id === 'p1')!
    expect(p1.total_points).toBe(15)
  })
  it('sorts by total descending', () => {
    const result = computeGlobalLeaderboard(entries, names)
    expect(result[0].player_id).toBe('p2')
    expect(result[1].player_id).toBe('p1')
  })
  it('assigns rank starting at 1', () => {
    const result = computeGlobalLeaderboard(entries, names)
    expect(result[0].rank).toBe(1)
    expect(result[1].rank).toBe(2)
  })
  it('includes character name from playerNames map', () => {
    const result = computeGlobalLeaderboard(entries, names)
    expect(result.find(r => r.player_id === 'p1')?.character_name).toBe('Aria')
  })
})
```

- [ ] **Step 9: Write jest.unit.config.ts**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  displayName: 'unit',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts?(x)'],
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
}

export default createJestConfig(config)
```

- [ ] **Step 10: Write jest.integration.config.ts**

```typescript
import type { Config } from 'jest'

const config: Config = {
  displayName: 'integration',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true } }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
}

export default config
```

- [ ] **Step 11: Add test scripts to package.json**

In `package.json`, update the `"scripts"` section:
```json
"test:unit": "jest --config jest.unit.config.ts",
"test:integration": "jest --config jest.integration.config.ts",
"test": "npm run test:unit"
```

- [ ] **Step 12: Write Supabase client files**

`src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 13: Write placeholder pages**

`src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = { title: 'Birthday Role Game' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

`src/app/page.tsx`:
```typescript
export default function HomePage() {
  return <main className="min-h-screen bg-bg-primary text-text-primary p-8">Landing placeholder</main>
}
```

`src/app/dashboard/page.tsx`:
```typescript
export default function DashboardPage() {
  return <main className="min-h-screen bg-bg-primary text-text-primary p-8">Dashboard placeholder</main>
}
```

`src/app/character/page.tsx`:
```typescript
export default function CharacterPage() {
  return <main className="min-h-screen bg-bg-primary text-text-primary p-8">Character placeholder</main>
}
```

`src/app/admin/layout.tsx`:
```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

`src/app/admin/page.tsx`:
```typescript
export default function AdminPage() {
  return <main className="min-h-screen bg-bg-primary text-text-primary p-8">Admin placeholder</main>
}
```

`src/app/live/page.tsx`:
```typescript
export default function LivePage() {
  return <main className="min-h-screen bg-bg-primary text-text-primary p-8">Live placeholder</main>
}
```

- [ ] **Step 14: Write .env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=https://bjzhndfzoadixicujufr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
TEST_SUPABASE_URL=<test project URL>
TEST_SUPABASE_ANON_KEY=<test project anon key>
TEST_SUPABASE_SERVICE_ROLE_KEY=<test project service role key>
```

Copy to `.env.local` and fill in real values from the Supabase dashboard.

- [ ] **Step 15: Write CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: ['feature/**', 'staging']
  pull_request:
    branches: ['staging', 'main']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

Add `TEST_SUPABASE_URL` and `TEST_SUPABASE_ANON_KEY` to the GitHub repo secrets (`Settings → Secrets and variables → Actions`).

- [ ] **Step 16: Run unit tests**

```bash
npm run test:unit
```

Expected: all 13 tests pass.

- [ ] **Step 17: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:3000` — should show "Landing placeholder" in dark background.

- [ ] **Step 18: Commit**

```bash
git add .
git commit -m "feat: Next.js scaffold, design tokens, types, utilities, and CI"
git push -u origin feature/M1-2-scaffold
```

Open PR: `feature/M1-2-scaffold → staging`

---

### Task 3 (Release 1.3): Authentication
> **Depends on Tasks 1 + 2 merged to staging.** Branch: `feature/M1-3-auth`

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/auth/confirm/route.ts`
- Modify: `src/app/page.tsx` (registration + login forms)
- Modify: `src/app/dashboard/page.tsx` (add auth check)
- Modify: `src/app/admin/layout.tsx` (add admin guard)

**Interfaces:**
- Consumes: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `Profile` type
- Produces: auth middleware, email confirmation handler, registration + login UI

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M1-3-auth
```

- [ ] **Step 2: Write src/middleware.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isProtected = ['/dashboard', '/character', '/admin'].some(r => pathname.startsWith(r))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/?reason=unauthenticated', request.url))
  }

  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/character/:path*', '/admin/:path*'],
}
```

- [ ] **Step 3: Write email confirmation route handler**

`src/app/auth/confirm/route.ts`:
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.redirect(new URL('/?reason=confirmation-failed', request.url))
}
```

Set the email confirmation redirect URL in Supabase dashboard → Authentication → URL Configuration:
- `Site URL`: your Vercel URL
- `Redirect URLs`: add `<your-vercel-url>/auth/confirm`

- [ ] **Step 4: Implement src/app/page.tsx with registration and login**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'register' | 'login'

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
      <div className="bg-bg-card rounded-lg p-8 w-full max-w-md shadow-md">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Birthday Role Game</h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMode('register')}
            className={`text-sm font-medium pb-1 border-b-2 ${mode === 'register' ? 'border-accent text-text-primary' : 'border-transparent text-text-muted'}`}
          >
            Register
          </button>
          <button
            onClick={() => setMode('login')}
            className={`text-sm font-medium pb-1 border-b-2 ${mode === 'login' ? 'border-accent text-text-primary' : 'border-transparent text-text-muted'}`}
          >
            Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-bg-secondary text-text-primary border border-border rounded-md px-4 py-2 text-md focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-bg-secondary text-text-primary border border-border rounded-md px-4 py-2 text-md focus:outline-none focus:border-accent"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          {message && <p className="text-success text-sm">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-accent hover:bg-accent-hover text-white font-medium rounded-md px-4 py-2 text-md disabled:opacity-50"
          >
            {loading ? 'Loading…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Update src/app/dashboard/page.tsx with server-side auth check**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-text-secondary">Welcome, {user.email}</p>
      {/* Character status, leaderboard, game status — implemented in Tasks 4 + 6 */}
    </main>
  )
}
```

- [ ] **Step 6: Update src/app/admin/layout.tsx with admin guard**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return <>{children}</>
}
```

- [ ] **Step 7: Verify manually**

```bash
npm run dev
```

1. Register with a real email — confirm "check your email" message appears
2. Click the confirmation link in the email — should redirect to `/dashboard`
3. Log out, log in — should reach `/dashboard`
4. Visit `/admin` while not logged in — should redirect to `/`

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: email/password auth with confirmation flow and route guards"
git push -u origin feature/M1-3-auth
```

Open PR: `feature/M1-3-auth → staging`

---

## Milestone 2 — Player Experience

### Task 4 (Release 2.1): Character Builder
> **⟳ PARALLEL with Task 5** — no file overlap. Depends on Task 3 merged. Branch: `feature/M2-1-character`

**Files:**
- Modify: `src/app/character/page.tsx`
- Create: `src/components/character/CharacterForm.tsx`
- Create: `tests/integration/character.test.ts`

**Interfaces:**
- Consumes: `Player`, `TraitOption`, `BackgroundOption`, `Event` types; `isPlayerComplete`, `validateTraitsNotDuplicate`; Supabase server client
- Produces: character builder form, auto-lock when `now() >= event_start_at`, `is_complete` auto-computed on save

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M2-1-character
```

- [ ] **Step 2: Write src/components/character/CharacterForm.tsx**

```typescript
'use client'

import { useState } from 'react'
import type { Player, TraitOption, BackgroundOption } from '@/lib/types/database'
import { isPlayerComplete, validateTraitsNotDuplicate } from '@/lib/utils/character'
import { createClient } from '@/lib/supabase/client'

interface CharacterFormProps {
  player: Player | null
  userId: string
  positiveTraits: TraitOption[]
  negativeTraits: TraitOption[]
  backgrounds: BackgroundOption[]
  isLocked: boolean
}

export function CharacterForm({
  player,
  userId,
  positiveTraits,
  negativeTraits,
  backgrounds,
  isLocked,
}: CharacterFormProps) {
  const [characterName, setCharacterName] = useState(player?.character_name ?? '')
  const [creature, setCreature] = useState(player?.creature ?? '')
  const [positiveTrait1, setPositiveTrait1] = useState(player?.positive_trait_1 ?? '')
  const [positiveTrait2, setPositiveTrait2] = useState(player?.positive_trait_2 ?? '')
  const [negativeTrait1, setNegativeTrait1] = useState(player?.negative_trait_1 ?? '')
  const [negativeTrait2, setNegativeTrait2] = useState(player?.negative_trait_2 ?? '')
  const [background, setBackground] = useState(player?.background ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!validateTraitsNotDuplicate(positiveTrait1 || null, positiveTrait2 || null)) {
      setError('Positive traits must be different.')
      return
    }
    if (!validateTraitsNotDuplicate(negativeTrait1 || null, negativeTrait2 || null)) {
      setError('Negative traits must be different.')
      return
    }

    const data = {
      user_id: userId,
      character_name: characterName || null,
      creature: creature || null,
      positive_trait_1: positiveTrait1 || null,
      positive_trait_2: positiveTrait2 || null,
      negative_trait_1: negativeTrait1 || null,
      negative_trait_2: negativeTrait2 || null,
      background: background || null,
      updated_at: new Date().toISOString(),
    }

    const complete = isPlayerComplete(data)
    setLoading(true)

    const { error: dbError } = player
      ? await supabase.from('players').update({ ...data, is_complete: complete }).eq('id', player.id)
      : await supabase.from('players').insert({ ...data, is_complete: complete })

    setLoading(false)
    if (dbError) setError(dbError.message)
    else setSaved(true)
  }

  const inputClass = `w-full bg-bg-secondary text-text-primary border border-border rounded-md px-4 py-2 text-md
    focus:outline-none focus:border-accent ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {isLocked && (
        <p className="text-warning text-sm">The event has started — your character is locked.</p>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Character Name</label>
        <input
          value={characterName}
          onChange={e => setCharacterName(e.target.value)}
          disabled={isLocked}
          placeholder="e.g. Aria Shadowbane"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Creature type <span className="text-text-muted">(e.g. human, ghost, dragon…)</span></label>
        <input
          value={creature}
          onChange={e => setCreature(e.target.value)}
          disabled={isLocked}
          placeholder="human"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Positive Trait 1</label>
        <select value={positiveTrait1} onChange={e => setPositiveTrait1(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— choose —</option>
          {positiveTraits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Positive Trait 2</label>
        <select value={positiveTrait2} onChange={e => setPositiveTrait2(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— choose —</option>
          {positiveTraits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Negative Trait 1</label>
        <select value={negativeTrait1} onChange={e => setNegativeTrait1(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— choose —</option>
          {negativeTraits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Negative Trait 2</label>
        <select value={negativeTrait2} onChange={e => setNegativeTrait2(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— choose —</option>
          {negativeTraits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-text-secondary text-sm">Background</label>
        <select value={background} onChange={e => setBackground(e.target.value)} disabled={isLocked} className={inputClass}>
          <option value="">— choose —</option>
          {backgrounds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      {saved && <p className="text-success text-sm">Character saved!</p>}

      {!isLocked && (
        <button
          type="submit"
          disabled={loading}
          className="bg-accent hover:bg-accent-hover text-white font-medium rounded-md px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save character'}
        </button>
      )}
    </form>
  )
}
```

- [ ] **Step 3: Update src/app/character/page.tsx**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CharacterForm } from '@/components/character/CharacterForm'

export default async function CharacterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [
    { data: player },
    { data: positiveTraits },
    { data: negativeTraits },
    { data: backgrounds },
    { data: event },
  ] = await Promise.all([
    supabase.from('players').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('trait_options').select('*').eq('type', 'positive').order('name'),
    supabase.from('trait_options').select('*').eq('type', 'negative').order('name'),
    supabase.from('background_options').select('*').order('name'),
    supabase.from('event').select('event_start_at').single(),
  ])

  const isLocked = event ? new Date() >= new Date(event.event_start_at) : false

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Character</h1>
        <CharacterForm
          player={player}
          userId={user.id}
          positiveTraits={positiveTraits ?? []}
          negativeTraits={negativeTraits ?? []}
          backgrounds={backgrounds ?? []}
          isLocked={isLocked}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Write integration test**

`tests/integration/character.test.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_ANON_KEY!
)

// These tests require a real test Supabase project with the schema applied.
// They sign up a fresh user, build a character, and verify is_complete logic.

describe('Character integration', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'Test1234!'
  let userId: string
  let playerId: string

  afterAll(async () => {
    // Clean up: delete player and user created during test
    if (playerId) await supabase.from('players').delete().eq('id', playerId)
  })

  it('creates a player row via insert', async () => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    expect(authError).toBeNull()
    userId = authData.user!.id

    const { data, error } = await supabase.from('players').insert({
      user_id: userId,
      character_name: 'Test Hero',
      creature: 'human',
      is_complete: false,
    }).select().single()

    expect(error).toBeNull()
    expect(data.character_name).toBe('Test Hero')
    playerId = data.id
  })

  it('is_complete stays false when fields are missing', async () => {
    const { data } = await supabase
      .from('players').select('is_complete').eq('id', playerId).single()
    expect(data!.is_complete).toBe(false)
  })
})
```

- [ ] **Step 5: Run unit tests**

```bash
npm run test:unit
```

Expected: all pass (no new unit tests for this task — logic already covered in Task 2 tests).

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```

1. Log in → navigate to `/character`
2. Fill all fields → save → "Character saved!" appears
3. Reload page → form repopulates with saved data
4. Test trait duplicate validation: select same trait for Positive 1 and Positive 2 → error appears

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: character builder form with validation and event lock"
git push -u origin feature/M2-1-character
```

Open PR: `feature/M2-1-character → staging`

---

### Task 5 (Release 2.2): Email Reminder Edge Function
> **⟳ PARALLEL with Task 4** — no file overlap. Branch: `feature/M2-2-email-reminder`

**Files:**
- Create: `supabase/functions/send-character-reminders/index.ts`

**Interfaces:**
- Consumes: `players` table (reads `is_complete = false`), Supabase SMTP
- Produces: scheduled Edge Function that emails incomplete players

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M2-2-email-reminder
```

- [ ] **Step 2: Write the Edge Function**

`supabase/functions/send-character-reminders/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (_req) => {
  const { data: incompletePlayers, error } = await supabase
    .from('players')
    .select('user_id, profiles!inner(email)')
    .eq('is_complete', false)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const emails = (incompletePlayers ?? []).flatMap((p: { profiles: { email: string } | { email: string }[] }) => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
    return profile?.email ? [profile.email] : []
  })

  for (const email of emails) {
    await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${Deno.env.get('SITE_URL')}/character` },
    })
    // Supabase auto-sends the magic link email; use it as the reminder vehicle.
    // Replace with a custom SMTP template via Supabase dashboard → Auth → Email Templates.
  }

  return new Response(
    JSON.stringify({ sent: emails.length, emails }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

- [ ] **Step 3: Deploy via Supabase MCP**

Use the Supabase MCP `deploy_edge_function` tool with function name `send-character-reminders` and the code above.

- [ ] **Step 4: Set SITE_URL secret in Supabase**

In the Supabase dashboard → Edge Functions → `send-character-reminders` → Secrets, add:
- `SITE_URL` = your Vercel production URL

- [ ] **Step 5: Verify the function is deployed**

Use `get_edge_function` MCP tool to confirm the function exists and is deployed.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/
git commit -m "feat: edge function for incomplete character email reminders"
git push -u origin feature/M2-2-email-reminder
```

Open PR: `feature/M2-2-email-reminder → staging`

---

### Task 6 (Release 2.3): Player Dashboard
> **Depends on Tasks 4 + 5 merged.** Branch: `feature/M2-3-dashboard`

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/app/character/page.tsx` navigation link from dashboard

**Interfaces:**
- Consumes: `Player`, `GlobalLeaderboardRow` types; `computeGlobalLeaderboard` util; Supabase server client
- Produces: dashboard showing character completion status, leaderboard position, nav link to character page

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M2-3-dashboard
```

- [ ] **Step 2: Update src/app/dashboard/page.tsx**

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeGlobalLeaderboard } from '@/lib/utils/leaderboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [
    { data: player },
    { data: leaderboardEntries },
    { data: players },
  ] = await Promise.all([
    supabase.from('players').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('leaderboard').select('*'),
    supabase.from('players').select('id, character_name'),
  ])

  const playerNames: Record<string, string | null> = {}
  for (const p of players ?? []) playerNames[p.id] = p.character_name

  const leaderboard = computeGlobalLeaderboard(leaderboardEntries ?? [], playerNames)
  const myRank = player ? leaderboard.find(r => r.player_id === player.id) : null

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link href="/character" className="text-accent hover:text-accent-hover text-sm">
            Edit character →
          </Link>
        </div>

        {/* Character status */}
        <div className="bg-bg-card rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4">Your Character</h2>
          {!player ? (
            <p className="text-warning">
              You haven't created your character yet.{' '}
              <Link href="/character" className="text-accent">Create it now →</Link>
            </p>
          ) : player.is_complete ? (
            <p className="text-success">
              ✓ <strong>{player.character_name}</strong> ({player.creature}) — character complete
            </p>
          ) : (
            <p className="text-warning">
              Character incomplete.{' '}
              <Link href="/character" className="text-accent">Finish it →</Link>
            </p>
          )}
        </div>

        {/* Leaderboard position */}
        {myRank && (
          <div className="bg-bg-card rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Your Standing</h2>
            <p className="text-text-secondary">
              Rank <span className="text-text-primary font-bold text-2xl">#{myRank.rank}</span>
              {' '}with <span className="text-accent font-bold">{myRank.total_points} pts</span>
            </p>
          </div>
        )}

        {/* Full leaderboard */}
        {leaderboard.length > 0 && (
          <div className="bg-bg-card rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
            <ol className="flex flex-col gap-2">
              {leaderboard.map(row => (
                <li key={row.player_id} className="flex justify-between text-sm">
                  <span className="text-text-muted">#{row.rank}</span>
                  <span className="text-text-primary">{row.character_name ?? 'Anonymous'}</span>
                  <span className="text-accent">{row.total_points} pts</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

1. Log in → `/dashboard` shows character status banner
2. Character not complete → warning with link to `/character`
3. Complete character → banner shows green completion message

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: player dashboard with character status and leaderboard position"
git push -u origin feature/M2-3-dashboard
```

Open PR: `feature/M2-3-dashboard → staging`

---

## Milestone 3 — Admin & Live Engine

### Task 7 (Release 3.1): Admin Panel + Game CRUD
> **⟳ PARALLEL with Task 8** — no file overlap. Branch: `feature/M3-1-admin`

**Files:**
- Modify: `src/app/admin/page.tsx`
- Create: `src/components/admin/GameList.tsx`
- Create: `src/components/admin/PlayerStatusTable.tsx`

**Interfaces:**
- Consumes: `Game`, `GameWithSteps`, `Player`, `GameStatusEntry` types; Supabase client + server
- Produces: admin UI for creating games, advancing game status, editing player statuses per game

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M3-1-admin
```

- [ ] **Step 2: Write src/components/admin/GameList.tsx**

```typescript
'use client'

import { useState } from 'react'
import type { GameWithSteps, Player } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { getNextStep, isLastStep } from '@/lib/utils/game-steps'
import { PlayerStatusTable } from './PlayerStatusTable'

interface GameListProps {
  games: GameWithSteps[]
  players: Player[]
}

export function GameList({ games: initialGames, players }: GameListProps) {
  const [games, setGames] = useState(initialGames)
  const supabase = createClient()

  async function advanceStep(game: GameWithSteps) {
    const nextStep = getNextStep(game.steps, game.current_step_id)

    if (!nextStep) {
      // All steps done — mark game finished
      await supabase.from('games').update({ status: 'finished', current_step_id: null }).eq('id', game.id)
      setGames(gs => gs.map(g => g.id === game.id ? { ...g, status: 'finished', current_step_id: null } : g))
      return
    }

    await supabase.from('games')
      .update({ status: 'active', current_step_id: nextStep.id })
      .eq('id', game.id)

    setGames(gs => gs.map(g =>
      g.id === game.id ? { ...g, status: 'active', current_step_id: nextStep.id } : g
    ))
  }

  async function resetGame(game: GameWithSteps) {
    await supabase.from('games').update({ status: 'pending', current_step_id: null }).eq('id', game.id)
    setGames(gs => gs.map(g => g.id === game.id ? { ...g, status: 'pending', current_step_id: null } : g))
  }

  return (
    <div className="flex flex-col gap-6">
      {games.map(game => (
        <div key={game.id} className="bg-bg-card rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-text-primary">{game.title}</h3>
              <p className="text-text-muted text-sm">
                {game.game_type} · team size: {game.team_size} · {game.status}
              </p>
            </div>
            <div className="flex gap-2">
              {game.status !== 'finished' && (
                <button
                  onClick={() => advanceStep(game)}
                  className="bg-accent hover:bg-accent-hover text-white text-sm rounded-md px-3 py-1"
                >
                  {game.status === 'pending' ? 'Start' : isLastStep(game.steps, game.current_step_id) ? 'Finish' : 'Next step'}
                </button>
              )}
              {game.status !== 'pending' && (
                <button
                  onClick={() => resetGame(game)}
                  className="border border-border text-text-secondary text-sm rounded-md px-3 py-1 hover:text-text-primary"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {game.status === 'active' && (
            <PlayerStatusTable gameId={game.id} players={players} />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write src/components/admin/PlayerStatusTable.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { Player, GameStatusEntry } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

const STATUS_OPTIONS = ['alive', 'eliminated', 'winner', 'spectator']

interface PlayerStatusTableProps {
  gameId: string
  players: Player[]
}

export function PlayerStatusTable({ gameId, players }: PlayerStatusTableProps) {
  const [entries, setEntries] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('game_status_entries')
      .select('*')
      .eq('game_id', gameId)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {}
          data.forEach((e: GameStatusEntry) => { map[e.player_id] = e.status })
          setEntries(map)
        }
      })
  }, [gameId])

  async function updateStatus(playerId: string, status: string) {
    setEntries(prev => ({ ...prev, [playerId]: status }))
    await supabase.from('game_status_entries').upsert({
      game_id: gameId,
      player_id: playerId,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'game_id,player_id' })
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-text-muted border-b border-border">
          <th className="text-left pb-2">Character</th>
          <th className="text-left pb-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {players.map(player => (
          <tr key={player.id} className="border-b border-border">
            <td className="py-2 text-text-primary">{player.character_name ?? '(unnamed)'}</td>
            <td className="py-2">
              <select
                value={entries[player.id] ?? 'alive'}
                onChange={e => updateStatus(player.id, e.target.value)}
                className="bg-bg-secondary text-text-primary border border-border rounded px-2 py-1 text-sm"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 4: Update src/app/admin/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { GameList } from '@/components/admin/GameList'
import type { GameWithSteps } from '@/lib/types/database'

export default async function AdminPage() {
  const supabase = await createClient()

  const [{ data: gamesRaw }, { data: players }] = await Promise.all([
    supabase.from('games').select('*, steps:game_steps(*)').order('order_index'),
    supabase.from('players').select('*').eq('is_complete', true),
  ])

  const games: GameWithSteps[] = (gamesRaw ?? []).map(g => ({
    ...g,
    steps: g.steps ?? [],
  }))

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
        <GameList games={games} players={players ?? []} />
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Manual verification**

```bash
npm run dev
```

1. Log in as admin user → `/admin` should load game list (empty for now)
2. Manually insert a test game + steps in Supabase dashboard
3. Click "Start" on the game → status advances, PlayerStatusTable appears
4. Change a player status → verify it saves in Supabase

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: admin panel with game status controls and player status editing"
git push -u origin feature/M3-1-admin
```

Open PR: `feature/M3-1-admin → staging`

---

### Task 8 (Release 3.2): Game Step Composition Engine
> **⟳ PARALLEL with Task 7** — no file overlap. Branch: `feature/M3-2-game-steps`

**Files:**
- Create: `src/components/game-steps/GameStep.tsx`
- Create: `src/components/game-steps/InstructionsStep.tsx`
- Create: `src/components/game-steps/StatusStep.tsx`
- Create: `src/components/game-steps/ResultsStep.tsx`
- Create: `src/components/game-steps/TeamArrangementStep.tsx`

**Interfaces:**
- Consumes: `Game`, `GameStep`, `Player` types; `GameStepProps` interface
- Produces: `GameStep` dispatcher + all step components, `isAdmin` branch in each

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M3-2-game-steps
```

- [ ] **Step 2: Write src/components/game-steps/GameStep.tsx**

```typescript
import type { Game, GameStep as GameStepType, Player } from '@/lib/types/database'
import { InstructionsStep } from './InstructionsStep'
import { StatusStep } from './StatusStep'
import { ResultsStep } from './ResultsStep'
import { TeamArrangementStep } from './TeamArrangementStep'

export interface GameStepProps {
  game: Game
  step: GameStepType
  players: Player[]
  isAdmin: boolean
}

export function GameStep(props: GameStepProps) {
  switch (props.step.step_type) {
    case 'instructions':   return <InstructionsStep {...props} />
    case 'status':         return <StatusStep {...props} />
    case 'results':        return <ResultsStep {...props} />
    case 'team_arrangement': return <TeamArrangementStep {...props} />
    default:               return null
  }
}
```

- [ ] **Step 3: Write InstructionsStep**

`src/components/game-steps/InstructionsStep.tsx`:
```typescript
import type { GameStepProps } from './GameStep'
import type { InstructionsContent } from '@/lib/types/database'

export function InstructionsStep({ game, step }: GameStepProps) {
  const content = step.content as InstructionsContent
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-text-muted text-sm mb-2 uppercase tracking-wide">{game.title}</p>
        <h2 className="text-3xl font-bold text-text-primary leading-tight">{content.text}</h2>
      </div>
      {content.images?.length > 0 && (
        <div className="flex flex-col gap-4">
          {content.images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Instruction image ${i + 1}`}
              className="w-full rounded-lg shadow-md"
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write StatusStep**

`src/components/game-steps/StatusStep.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import type { GameStepProps } from './GameStep'
import type { StatusContent, GameStatusEntry } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

export function StatusStep({ game, step, players, isAdmin }: GameStepProps) {
  const content = step.content as StatusContent
  const [entries, setEntries] = useState<GameStatusEntry[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('game_status_entries')
      .select('*')
      .eq('game_id', game.id)
      .then(({ data }) => setEntries(data ?? []))

    const channel = supabase
      .channel(`status-${game.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_status_entries',
        filter: `game_id=eq.${game.id}`,
      }, payload => {
        setEntries(prev => {
          const updated = payload.new as GameStatusEntry
          const idx = prev.findIndex(e => e.id === updated.id)
          return idx >= 0
            ? prev.map(e => e.id === updated.id ? updated : e)
            : [...prev, updated]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [game.id])

  const statusMap: Record<string, string> = {}
  entries.forEach(e => { statusMap[e.player_id] = e.status })

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-text-primary">{content.label || 'Game Status'}</h2>
      <div className="grid grid-cols-2 gap-4">
        {players.map(player => {
          const status = statusMap[player.id] ?? 'alive'
          const statusColor = status === 'alive' ? 'text-success' : status === 'winner' ? 'text-warning' : 'text-text-muted line-through'
          return (
            <div key={player.id} className="bg-bg-card rounded-lg p-4 flex justify-between items-center shadow-sm">
              <span className="text-text-primary font-medium">{player.character_name}</span>
              <span className={`text-sm font-medium ${statusColor}`}>{status}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write ResultsStep**

`src/components/game-steps/ResultsStep.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import type { GameStepProps } from './GameStep'
import type { ResultsContent, LeaderboardEntry } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { computeGlobalLeaderboard } from '@/lib/utils/leaderboard'

export function ResultsStep({ game, step, players, isAdmin }: GameStepProps) {
  const content = step.content as ResultsContent
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [points, setPoints] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('leaderboard').select('*').eq('game_id', game.id)
      .then(({ data }) => setEntries(data ?? []))

    const channel = supabase
      .channel(`leaderboard-${game.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'leaderboard',
        filter: `game_id=eq.${game.id}`,
      }, payload => {
        setEntries(prev => {
          const updated = payload.new as LeaderboardEntry
          const idx = prev.findIndex(e => e.id === updated.id)
          return idx >= 0 ? prev.map(e => e.id === updated.id ? updated : e) : [...prev, updated]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [game.id])

  async function savePoints() {
    setSaving(true)
    const upserts = Object.entries(points)
      .filter(([, v]) => v !== '')
      .map(([player_id, pts]) => ({
        game_id: game.id,
        player_id,
        points: parseInt(pts, 10),
      }))
    await supabase.from('leaderboard').upsert(upserts, { onConflict: 'game_id,player_id' })
    setSaving(false)
  }

  const playerNames: Record<string, string | null> = {}
  players.forEach(p => { playerNames[p.id] = p.character_name })

  const globalBoard = computeGlobalLeaderboard(entries, playerNames)
  const gamePointsMap: Record<string, number> = {}
  entries.forEach(e => { gamePointsMap[e.player_id] = e.points })

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-text-primary">{content.label || 'Results'}</h2>

      {isAdmin && (
        <div className="bg-bg-card rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4 text-text-secondary">Enter points</h3>
          <div className="flex flex-col gap-2">
            {players.map(player => (
              <div key={player.id} className="flex items-center gap-4">
                <span className="text-text-primary flex-1">{player.character_name}</span>
                <input
                  type="number"
                  min="0"
                  placeholder={String(gamePointsMap[player.id] ?? 0)}
                  value={points[player.id] ?? ''}
                  onChange={e => setPoints(prev => ({ ...prev, [player.id]: e.target.value }))}
                  className="w-20 bg-bg-secondary text-text-primary border border-border rounded px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={savePoints}
            disabled={saving}
            className="mt-4 bg-accent hover:bg-accent-hover text-white text-sm rounded-md px-4 py-2 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save points'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium text-text-secondary">This game</h3>
        {players
          .filter(p => gamePointsMap[p.id] !== undefined)
          .sort((a, b) => (gamePointsMap[b.id] ?? 0) - (gamePointsMap[a.id] ?? 0))
          .map(player => (
            <div key={player.id} className="flex justify-between text-sm">
              <span className="text-text-primary">{player.character_name}</span>
              <span className="text-accent">{gamePointsMap[player.id] ?? 0} pts</span>
            </div>
          ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write TeamArrangementStep placeholder**

`src/components/game-steps/TeamArrangementStep.tsx`:
```typescript
import type { GameStepProps } from './GameStep'

export function TeamArrangementStep(_props: GameStepProps) {
  return (
    <div className="text-text-muted p-8 text-center">
      Team arrangement — coming soon
    </div>
  )
}
```

- [ ] **Step 7: Run unit tests**

```bash
npm run test:unit
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: GameStep composition engine with InstructionsStep, StatusStep, ResultsStep"
git push -u origin feature/M3-2-game-steps
```

Open PR: `feature/M3-2-game-steps → staging`

---

### Task 9 (Release 3.3): Realtime + Live Page
> **Depends on Tasks 7 + 8 merged.** Branch: `feature/M3-3-live`

**Files:**
- Modify: `src/app/live/page.tsx`

**Interfaces:**
- Consumes: `GameStep` component, `GameWithSteps`, `Player` types; Supabase Realtime; `getCurrentStep`
- Produces: `/live` page with real-time game step updates

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M3-3-live
```

- [ ] **Step 2: Update src/app/live/page.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { GameWithSteps, Player, Game } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { GameStep } from '@/components/game-steps/GameStep'
import { getCurrentStep } from '@/lib/utils/game-steps'

export default function LivePage() {
  const [games, setGames] = useState<GameWithSteps[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: gamesRaw }, { data: playersData }] = await Promise.all([
        supabase.from('games').select('*, steps:game_steps(*)').order('order_index'),
        supabase.from('players').select('*').eq('is_complete', true),
      ])
      setGames((gamesRaw ?? []).map(g => ({ ...g, steps: g.steps ?? [] })))
      setPlayers(playersData ?? [])
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('live-game-updates')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'games',
      }, payload => {
        setGames(prev => prev.map(g =>
          g.id === (payload.new as Game).id ? { ...g, ...(payload.new as Game) } : g
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted text-lg">Loading…</p>
      </div>
    )
  }

  const activeGame = games.find(g => g.status === 'active')

  if (!activeGame) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-secondary text-2xl">No active game</p>
      </div>
    )
  }

  const currentStep = getCurrentStep(activeGame.steps, activeGame.current_step_id)

  if (!currentStep) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-secondary text-2xl">{activeGame.title}</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-12">
      <GameStep
        game={activeGame}
        step={currentStep}
        players={players}
        isAdmin={false}
      />
    </main>
  )
}
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

1. Open `/live` in one browser tab
2. Open `/admin` in another, start a game and advance steps
3. `/live` tab should update without refresh

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: live page with realtime game step updates"
git push -u origin feature/M3-3-live
```

Open PR: `feature/M3-3-live → staging`

---

### Task 10 (Release 3.4): Global Leaderboard
> **Depends on Task 9 merged.** Branch: `feature/M3-4-leaderboard`

**Files:**
- Modify: `src/app/live/page.tsx` (add leaderboard between games)
- Modify: `src/app/dashboard/page.tsx` (already uses `computeGlobalLeaderboard` — verify it works end-to-end after points exist)

**Interfaces:**
- Consumes: `leaderboard` table Realtime updates; `computeGlobalLeaderboard`
- Produces: live leaderboard visible on `/live` between/after games, leaderboard updates in realtime on dashboard

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M3-4-leaderboard
```

- [ ] **Step 2: Add live leaderboard to src/app/live/page.tsx**

Add leaderboard state and realtime subscription. In the "No active game" branch, show the full leaderboard instead of "No active game":

```typescript
// Add inside useEffect, after the games channel:
const lbChannel = supabase
  .channel('live-leaderboard')
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'leaderboard',
  }, async () => {
    const { data } = await supabase.from('leaderboard').select('*')
    setLeaderboardEntries(data ?? [])
  })
  .subscribe()
```

Also add a `leaderboardEntries` state and fetch it in the initial `load()` call. In the "no active game" branch:

```typescript
const leaderboard = computeGlobalLeaderboard(leaderboardEntries, playerNames)

return (
  <main className="min-h-screen bg-bg-primary text-text-primary p-12">
    <h1 className="text-4xl font-bold mb-8 text-center">Leaderboard</h1>
    <ol className="max-w-lg mx-auto flex flex-col gap-4">
      {leaderboard.map(row => (
        <li key={row.player_id} className="bg-bg-card rounded-lg p-4 flex justify-between items-center shadow-md">
          <span className="text-text-muted text-xl font-bold">#{row.rank}</span>
          <span className="text-text-primary text-xl">{row.character_name ?? 'Unknown'}</span>
          <span className="text-accent text-xl font-bold">{row.total_points} pts</span>
        </li>
      ))}
    </ol>
  </main>
)
```

- [ ] **Step 3: Manual verification**

1. Enter points for a game via `/admin` → `/live` (when no active game) shows leaderboard updating in real time
2. `/dashboard` also shows updated leaderboard

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: global leaderboard with realtime updates on live page"
git push -u origin feature/M3-4-leaderboard
```

Open PR: `feature/M3-4-leaderboard → staging`

---

## Milestone 4 — Content & Polish

### Task 11 (Release 4.1): Seed Games Content
> **⟳ PARALLEL with Task 12** — no file overlap. Branch: `feature/M4-1-seed-games`

**Files:**
- Create: `supabase/migrations/003_games.sql`

**Interfaces:**
- Produces: all 15–25 games with steps and instruction content inserted into the DB

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M4-1-seed-games
```

- [ ] **Step 2: Write supabase/migrations/003_games.sql**

Insert each game with its steps. Pattern for each game:

```sql
-- Game: Human Tower
do $$
declare
  game_id uuid := uuid_generate_v4();
  step1_id uuid := uuid_generate_v4();
  step2_id uuid := uuid_generate_v4();
  step3_id uuid := uuid_generate_v4();
begin
  insert into public.games (id, title, order_index, status, team_size, game_type)
  values (game_id, 'Human Tower', 1, 'pending', 4, 'strongness');

  insert into public.game_steps (id, game_id, step_type, order_index, content) values
    (step1_id, game_id, 'instructions', 0, '{"text": "Build the tallest human tower with the fewest people in the base. Each team has 4 minutes.", "images": []}'),
    (step2_id, game_id, 'status',       1, '{"label": "Who is still standing?"}'),
    (step3_id, game_id, 'results',      2, '{"label": "Human Tower Results"}');
end;
$$;

-- Repeat this block for each game, incrementing order_index.
-- Add all 15-25 games before the event. Images array is populated in Task 13.
```

Add all planned games using the same pattern. Leave `images: []` for now — they will be filled in Task 13.

- [ ] **Step 3: Apply migration via Supabase MCP**

Use `apply_migration` with the contents of `003_games.sql`.

- [ ] **Step 4: Verify in Supabase**

Use `list_tables` and `execute_sql` to confirm games and steps are inserted correctly:
```sql
select g.title, count(s.id) as step_count
from games g
left join game_steps s on s.game_id = g.id
group by g.title
order by g.order_index;
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/003_games.sql
git commit -m "feat: seed all games with steps and placeholder instruction content"
git push -u origin feature/M4-1-seed-games
```

Open PR: `feature/M4-1-seed-games → staging`

---

### Task 12 (Release 4.2): Countdown Screen
> **⟳ PARALLEL with Task 11** — no file overlap. Branch: `feature/M4-2-countdown`

**Files:**
- Create: `src/components/live/Countdown.tsx`
- Modify: `src/app/live/page.tsx` (show countdown before `event_start_at`)
- Modify: `src/app/page.tsx` (show event countdown on landing page)

**Interfaces:**
- Consumes: `Event.event_start_at`
- Produces: full-screen countdown on `/live` before event; smaller countdown on landing page

- [ ] **Step 1: Create branch**

```bash
git checkout staging && git pull
git checkout -b feature/M4-2-countdown
```

- [ ] **Step 2: Write src/components/live/Countdown.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'

interface CountdownProps {
  targetDate: string
  onComplete?: () => void
  size?: 'large' | 'small'
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: string): TimeLeft | null {
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function Countdown({ targetDate, onComplete, size = 'large' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft(targetDate))

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = calculateTimeLeft(targetDate)
      setTimeLeft(tl)
      if (!tl) {
        clearInterval(timer)
        onComplete?.()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate, onComplete])

  if (!timeLeft) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const unitClass = size === 'large'
    ? 'flex flex-col items-center gap-1'
    : 'flex flex-col items-center gap-0.5'
  const numClass = size === 'large'
    ? 'text-4xl font-bold text-text-primary'
    : 'text-xl font-bold text-text-primary'
  const labelClass = 'text-text-muted text-xs uppercase tracking-widest'

  return (
    <div className={`flex gap-${size === 'large' ? '8' : '4'}`}>
      {timeLeft.days > 0 && (
        <div className={unitClass}>
          <span className={numClass}>{pad(timeLeft.days)}</span>
          <span className={labelClass}>days</span>
        </div>
      )}
      <div className={unitClass}>
        <span className={numClass}>{pad(timeLeft.hours)}</span>
        <span className={labelClass}>hours</span>
      </div>
      <div className={unitClass}>
        <span className={numClass}>{pad(timeLeft.minutes)}</span>
        <span className={labelClass}>min</span>
      </div>
      <div className={unitClass}>
        <span className={numClass}>{pad(timeLeft.seconds)}</span>
        <span className={labelClass}>sec</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add countdown logic to src/app/live/page.tsx**

Fetch the event row in the initial `load()`:
```typescript
const { data: eventRow } = await supabase.from('event').select('*').single()
setEvent(eventRow)
```

Add an `event` state and, before the active game check, add:
```typescript
const isBeforeEvent = event && new Date() < new Date(event.event_start_at)

if (isBeforeEvent) {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold text-text-primary">{event.name}</h1>
      <p className="text-text-secondary text-xl">Starts in</p>
      <Countdown targetDate={event.event_start_at} size="large" />
    </main>
  )
}
```

- [ ] **Step 4: Add countdown to landing page**

In `src/app/page.tsx`, fetch the event server-side and pass `event_start_at` to a client component that renders the `Countdown`. The landing page becomes a Server Component again with a `'use client'` child for the form + countdown.

- [ ] **Step 5: Manual verification**

Set `event_start_at` to 1 minute in the future in Supabase → visit `/live` → countdown appears. Wait for it to hit 0 → page switches to "No active game" view.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: countdown screen on live page and landing page"
git push -u origin feature/M4-2-countdown
```

Open PR: `feature/M4-2-countdown → staging`

---

### Task 13 (Release 4.3): Image Upload UI
> **Depends on Tasks 11 + 12 merged.** Branch: `feature/M4-3-image-upload`

**Files:**
- Modify: `src/app/admin/page.tsx` (add image upload per instruction step)
- Create: `src/components/admin/ImageUploader.tsx`

**Interfaces:**
- Consumes: Supabase Storage bucket `game-images`; `game_steps.content` (updates `images` array)
- Produces: admin UI for uploading images to instruction steps; URLs stored in `content.images[]`

- [ ] **Step 1: Create branch + Storage bucket**

```bash
git checkout staging && git pull
git checkout -b feature/M4-3-image-upload
```

Create a public Supabase Storage bucket named `game-images` via the Supabase dashboard → Storage → New bucket. Enable public access.

- [ ] **Step 2: Write src/components/admin/ImageUploader.tsx**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { InstructionsContent } from '@/lib/types/database'

interface ImageUploaderProps {
  stepId: string
  currentContent: InstructionsContent
  onUpload: (newContent: InstructionsContent) => void
}

export function ImageUploader({ stepId, currentContent, onUpload }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const fileName = `${stepId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const { error: uploadError } = await supabase.storage
      .from('game-images')
      .upload(fileName, file, { upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('game-images').getPublicUrl(fileName)
    const newContent: InstructionsContent = {
      ...currentContent,
      images: [...(currentContent.images ?? []), publicUrl],
    }

    await supabase.from('game_steps').update({ content: newContent }).eq('id', stepId)
    onUpload(newContent)
    setUploading(false)
  }

  async function removeImage(url: string) {
    const newContent: InstructionsContent = {
      ...currentContent,
      images: currentContent.images.filter(u => u !== url),
    }
    await supabase.from('game_steps').update({ content: newContent }).eq('id', stepId)
    onUpload(newContent)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {currentContent.images?.map(url => (
          <div key={url} className="relative group">
            <img src={url} alt="instruction" className="h-20 w-20 object-cover rounded-md" />
            <button
              onClick={() => removeImage(url)}
              className="absolute top-1 right-1 bg-danger text-white text-xs rounded-full w-5 h-5 hidden group-hover:flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label className="cursor-pointer text-accent text-sm hover:text-accent-hover">
        {uploading ? 'Uploading…' : '+ Add image'}
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
      </label>
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Wire ImageUploader into admin panel**

In `src/components/admin/GameList.tsx`, for each game that has instruction steps, render `<ImageUploader>` below the game controls. The `GameList` already receives `games` with steps — filter for `step_type === 'instructions'` and render one uploader per instruction step.

- [ ] **Step 4: Manual verification**

1. Go to `/admin`
2. Find a game with an instructions step
3. Upload an image → thumbnail appears
4. Visit `/live`, start that game → instruction step shows the image

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: image upload for instruction steps via Supabase Storage"
git push -u origin feature/M4-3-image-upload
```

Open PR: `feature/M4-3-image-upload → staging`

---

### Task 14 (Release 4.4): E2E Tests + Staging Smoke Tests
> **Depends on all previous tasks merged to staging.** Branch: `feature/M4-4-e2e`

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/registration.spec.ts`
- Create: `tests/e2e/character.spec.ts`
- Create: `tests/e2e/live.spec.ts`

**Interfaces:**
- Consumes: staging Vercel URL; test user credentials
- Produces: E2E test suite that covers the golden path for each user type

- [ ] **Step 1: Create branch and install Playwright**

```bash
git checkout staging && git pull
git checkout -b feature/M4-4-e2e
npm init playwright@latest -- --quiet
```

When prompted: TypeScript, `tests/e2e` folder, add GitHub Actions: Yes, install browsers: Yes.

- [ ] **Step 2: Write playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

- [ ] **Step 3: Write tests/e2e/registration.spec.ts**

```typescript
import { test, expect } from '@playwright/test'

test('landing page shows registration form', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Birthday Role Game')).toBeVisible()
  await expect(page.getByPlaceholder('Email')).toBeVisible()
  await expect(page.getByPlaceholder('Password')).toBeVisible()
})

test('unauthenticated access to /dashboard redirects to /', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/$/)
})

test('unauthenticated access to /admin redirects to /', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/$/)
})
```

- [ ] **Step 4: Write tests/e2e/live.spec.ts**

```typescript
import { test, expect } from '@playwright/test'

test('/live is publicly accessible', async ({ page }) => {
  await page.goto('/live')
  // Either shows countdown, "No active game", or an active game step
  await expect(page).not.toHaveURL(/\/$/)
})
```

- [ ] **Step 5: Write tests/e2e/character.spec.ts**

```typescript
import { test, expect } from '@playwright/test'

// These tests require a pre-seeded test account defined in env vars.
// Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in CI secrets.

test.describe('Character builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Login' }).click()
    await page.getByPlaceholder('Email').fill(process.env.E2E_TEST_EMAIL!)
    await page.getByPlaceholder('Password').fill(process.env.E2E_TEST_PASSWORD!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('/dashboard')
  })

  test('character page loads for authenticated user', async ({ page }) => {
    await page.goto('/character')
    await expect(page.getByRole('heading', { name: 'Your Character' })).toBeVisible()
  })
})
```

- [ ] **Step 6: Add E2E script to package.json**

```json
"test:e2e": "playwright test"
```

- [ ] **Step 7: Add E2E secrets to GitHub**

In GitHub repo → Settings → Secrets: add `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_BASE_URL` (pointing to staging Vercel URL).

- [ ] **Step 8: Update .github/workflows/ci.yml to add E2E job**

Add after the `test` job:
```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
    env:
      E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}
      E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
      E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

- [ ] **Step 9: Run E2E tests against dev server**

```bash
npm run dev &
npm run test:e2e
```

Expected: all E2E tests pass.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "test: add Playwright E2E tests for registration, live, and character flows"
git push -u origin feature/M4-4-e2e
```

Open PR: `feature/M4-4-e2e → staging`

---

## Milestone Completions → Production

After each milestone's PRs are all merged to `staging` and smoke-tested:

```bash
# Open PR: staging → main
gh pr create --base main --head staging --title "Release: Milestone N — <name>" --body "All M<N> releases merged and smoke-tested on staging."
```

Merge triggers Vercel production deploy automatically.
