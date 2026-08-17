# SkyGrid — Drone Survey Management System

A full-stack, multi-tenant drone survey mission management platform for planning, monitoring, and reporting on autonomous drone surveys across an organization's fleet and sites.

**Live application:** _hosting link pending — see [Deployment](#deployment)._

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Bonus Features Beyond the Requirements](#bonus-features-beyond-the-requirements)
- [Technical Stack](#technical-stack)
- [Architecture](#architecture)
- [Engineering & SOLID Principles](#engineering--solid-principles)
- [Write-up: Approach, Trade-offs & Safety](#write-up-approach-trade-offs--safety)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)

---

## Overview

This project implements the **Drone Survey Management System Design Challenge**. It focuses exclusively on the mission management and reporting backbone of drone operations (live video feeds, actual image collection, and 3D map generation are out of scope):

1. **Mission Planning** — define survey areas, configure flight patterns (grid, crosshatch, perimeter), altitude, overlap, and waypoint density.
2. **Fleet Management** — organization-wide drone inventory with live status (available, in-mission, charging), battery, and other telemetry.
3. **Real-time Mission Monitoring** — live drone flight paths on a map, mission progress (%, ETA), status transitions, and mission control actions (pause / resume / abort).
4. **Survey Reporting** — per-flight statistics (duration, distance, coverage) and organization-wide survey analytics.

The system is multi-tenant: each registered organization owns its fleet, missions, and data, enforced through **Row Level Security (RLS)** at the database level.

## Features

### Mission Planning & Configuration
- Draw a survey area directly on an interactive MapLibre map (click vertices, double-click to close), or load a predefined sample site in one click.
- Choose a survey pattern — **grid** (single-direction passes), **crosshatch** (dual-direction, maximum coverage), or **perimeter** (boundary trace) — each rendered as a live route preview.
- Configure mission parameters with instant feedback: altitude, cruise speed, sensor overlap %, capture cadence, and swath factor.
- Live mission estimate panel (route length, passes, waypoint count, estimated duration) updates as you adjust parameters.
- Assign a specific aircraft or auto-assign at launch.
- **Info tips ("i" buttons)** on every parameter explain what it controls and how it affects coverage — helpful onboarding without cluttering the UI.

### Fleet Visualisation & Management Dashboard
- Organization-wide drone inventory with status chips (available / in-mission / charging / maintenance / offline).
- Battery levels with color-coded bars and key stats (max range, max speed, max altitude).
- Live fleet-position map showing each aircraft's location.
- Quick-glance summary cards: total aircraft, available, deployed, grounded.

### Real-time Mission Monitoring
- Live map visualization of in-flight drones: planned route, flown path, and a moving drone marker with heading.
- Mission progress (% complete), waypoint progress, distance flown, and ETA.
- Status tracking for every lifecycle transition: starting → in progress → paused/resumed → completed / aborted.
- Full **mission control**: pause, resume, and abort from a single panel.
- Append-only event log per mission (launch, pause, resume, waypoints, completion, abort).
- Live-updating mission queue with per-mission progress bars, refreshed at 1-second intervals.

### Survey Reporting & Analytics Portal
- Org-wide headline stats: total surveys, accumulated flight hours, distance flown, and frames captured.
- Interactive charts: **survey throughput** (area/line), **mission status mix** (donut with legend), **coverage per mission** (bar chart), and **fleet utilization** (pattern breakdown).
- Per-flight detail table (report log): duration, distance, coverage %, images captured, status.
- Info tips on every stat and chart explain exactly what the metric measures.

### Authentication & Multi-tenancy
- Email/password sign-up and login via Supabase Auth.
- Auto-provisioning on signup: a new organization, user profile, and a 3-drone starter fleet are created automatically.
- Edge-level auth routing (`proxy.ts`): protected routes redirect to `/login`, authenticated users get bounced off public pages, and static assets (images, 3D model files) bypass auth checks.
- Row Level Security on every table scoped to the authenticated user's `org_id` — cross-tenant leakage is structurally impossible.

## Bonus Features Beyond the Requirements

In addition to the four required pillars, the following were implemented to raise the quality bar:

- **Deterministic, time-derived simulation engine.** Mission state is a *pure function* of `(plan, control timeline, now)` — no background simulator process, no WebSockets. Any component can recompute the exact current state at any instant, which makes the live monitor server-renderable, horizontally scalable, and perfectly replayable for audits.
- **Pause-aware timeline math.** Pausing inserts wall-clock slack into the control timeline so elapsed flight time, battery, and coverage remain correct across pause/resume cycles; aborts freeze state at the interrupted waypoint.
- **3D drone landing page.** An interactive React-Three-Fiber scene loads a glTF drone model (CC-BY-4.0 licensed, attribution retained) with a floating/rotation animation, plus a starfield background.
- **Productized landing page.** Hero with real aerial survey imagery, workflow explainer, fieldwork band, and results cards with drone photographs.
- **Info-tip education layer.** A reusable `InfoTip` popover component + a central metrics dictionary (`src/lib/metrics.ts`) puts a plain-language explanation on every planner parameter, dashboard stat, and analytics chart.
- **Mobile-responsive dashboard.** A collapsible hamburger navigation in the topbar replaces the desktop sidebar on small screens; all grids, maps, and tables adapt to mobile viewports.
- **Short-TTL read cache.** Dashboard reads are memoized server-side for a few seconds; every write invalidates the org's cached reads immediately — keeps heavy pages snappy under 1s polling.
- **Concurrency-safe mission finalization.** Completion writes are deduplicated across simultaneous telemetry polls so a mission is finalized exactly once.
- **Real-world seed data.** Sample sites and the starter fleet are pre-positioned around Indian survey locations (Bengaluru, Mumbai, Delhi, Jodhpur) for a realistic local experience.

## Technical Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16 (App Router, TypeScript, Turbopack) |
| **Styling** | Tailwind CSS 4 |
| **Maps** | MapLibre GL + react-map-gl |
| **3D** | React Three Fiber, drei, three.js |
| **Animation** | framer-motion |
| **Charts** | Recharts |
| **Backend/DB** | Supabase (Postgres + Auth), Row Level Security |
| **Icons** | lucide-react |
| **Utilities** | clsx + tailwind-merge, server-only |
| **Auth middleware** | @supabase/ssr (`proxy.ts` edge routing) |

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Next.js App (Vercel-ready)                                │
│                                                            │
│  /  landing · /login /signup · /overview · /fleet          │
│  /plan · /monitor · /analytics                             │
│  /api/missions · /api/missions/[id]/live · .../control     │
│                                                            │
│  Repository layer (src/lib/repository.ts)                  │
│    └─ Supabase client (anon) + admin client (service role) │
│                                                            │
│  Mission service (src/lib/mission-service.ts)              │
│    └─ orchestrates start / pause / resume / abort / finalize│
│                                                            │
│  Deterministic simulation engine (src/lib/simulation)      │
│    └─ mission state = f(plan, control timeline, now)       │
└────────────────────────────────────────────────────────────┘
                          │ 1s polling / POST control
                          ▼
              ┌─────────────────────────┐
              │  Supabase (Postgres)    │
              │  auth.users             │
              │  organizations          │
              │  profiles               │
              │  drones                 │
              │  missions               │
              │  mission_events         │
              │  RLS enforced           │
              └─────────────────────────┘
```

### Design decision: deterministic simulation

Instead of a server-side flight simulator broadcasting over WebSockets, the app models mission state as a **pure function of time**:

```
currentMissionState = f(missionPlan, controlTimeline, now)
```

- A mission plan encodes the full flight path as a list of waypoints (altitude, speed, capture cadence).
- Control actions (pause / resume / abort) append immutable events to a control timeline.
- At any timestamp `t`, the state (position, battery, coverage, images, status) is recomputed deterministically from the plan and the applied controls.

**Why this matters:**
- The same model drives the server-rendered dashboard, the live monitoring route, and the client — no drift between views.
- It is naturally scalable: a mission needs no dedicated simulator process, so thousands of concurrent missions cost nothing extra.
- Replays and audits are exact: the same inputs always produce the same flight record.

### Repository layout

```
src/
  app/            Next.js routes (dashboard pages + API routes)
  components/     UI + map + 3D components (overview, fleet, survey, monitor, drone-scene)
  lib/            supabase clients, repository, mission-service, metrics, types
  lib/simulation/ deterministic engine + pattern generators + geometry
  proxy.ts        auth-aware request routing (edge middleware)
public/models/    glTF drone model (CC-BY-4.0, license.txt included)
supabase/
  schema.sql      canonical database schema + RLS + triggers
```

## Engineering & SOLID Principles

The codebase is deliberately layered so each concern has a single owner and a single reason to change.

### Single Responsibility Principle (SRP)
Each layer does exactly one job:
- **`repository.ts`** — *data gateway only.* All Supabase REST calls (anon for reads, service-role for writes) live here; the rest of the app never touches the transport.
- **`mission-service.ts`** — *use-case orchestration only.* Encapsulates start / pause / resume / abort / finalize and the completion write-path, keeping route handlers thin.
- **`simulation/engine.ts`** — *pure state computation only.* No I/O; a deterministic function of inputs.
- **`simulation/patterns.ts`** — *route geometry only.* Flight-line generators (grid, crosshatch, perimeter) that map a polygon + config → waypoints.
- **Route handlers** (`app/api/...`) — parse the request, delegate to a service, return JSON. Typically 20–50 lines.
- **Page components** — server components for data-fetching, narrow client components for interaction.

### Open/Closed Principle (OCP)
The system is open for extension without modifying existing code:
- New survey patterns are just **generator functions** over waypoints in `patterns.ts` — adding one is configuration, not a rewrite of the engine.
- New mission control actions are discrete functions in the engine and switch cases in the service — the control API stays stable.
- The repository exposes a stable interface; a future backend (e.g. PostgreSQL direct, another cloud DB) can be swapped in beneath it without touching callers.

### Liskov Substitution Principle (LSP)
- The Supabase repository exposes the **same repository function signatures** and domain types across every caller — pages and API routes can't tell a server component fetch from a polling fetch, keeping the data contract stable.
- `Mission` / `MissionSummary` share a consistent shape; the lightweight summary is a valid projection of the full mission wherever the heavy jsonb columns aren't needed.

### Interface Segregation Principle (ISP)
- `MissionSummary` intentionally omits heavy jsonb columns (waypoints, area_geojson, telemetry_snapshot) for the high-frequency live-list poll — clients get exactly the interface they need, nothing more.
- Components accept narrow props (e.g. `SurveyMap` takes only the map data it renders), so they're easy to reuse and test in isolation.

### Dependency Inversion Principle (DIP)
- High-level modules (`mission-service`, pages) depend on **abstractions** (`repository` functions, engine types), never on Supabase or Postgres directly.
- Concrete transport details (Supabase REST via anon vs. service-role clients) are resolved *inside* the low-level repository and isolated by dynamic imports, so high-level modules never depend on a specific Supabase construct.
- Route handlers depend on the mission-service interface, not on the persistence details.

### Additional best practices
- **Server-only modules** (`import "server-only"`) prevent accidentally importing repository/service code into client bundles.
- **Thin route handlers** — business logic lives in services, not routes.
- **Static asset isolation** — the auth middleware exempts images, fonts, and 3D model files from auth checks so the landing page loads instantly.
- **No unused dependencies** — the dependency list is trimmed to what the code actually imports.
- **TypeScript throughout** — shared domain types in `src/lib/types.ts` keep the data contract explicit across layers.

## Write-up: Approach, Trade-offs & Safety

### How I approached the problem

I started from the assignment's core premise: the valuable engineering is the **mission-management backbone**, not the video/image capture. I therefore designed around four pillars — planning, fleet, live monitoring, and reporting — and built them on a single data model so every view shares one source of truth.

The single most important architectural decision was the **deterministic, time-derived simulation** described above. Rather than fighting real-time infrastructure, I inverted the problem: make the "simulator" a pure function and let any component ask "what is the state at time t?" This eliminated an entire class of consistency bugs (server vs. client drift, missed messages, replay issues) and made the live view trivially server-renderable.

For the front end, I chose Next.js App Router + server components for the data-heavy pages and isolated the interactive pieces (maps, polling) into narrow client components. Multi-tenancy was a first-class concern: every query flows through `resolveOrgId()` and RLS enforces isolation at the database, so a bug in the UI can never leak data across organizations.

### Trade-offs considered

| Decision | Chosen | Trade-off / rationale |
| --- | --- | --- |
| Real-time transport | 1s polling + deterministic engine | WebSockets would be lower latency but add infrastructure, connection management, and replay complexity. Polling + pure-function state is robust, horizontally scalable, and sufficient for mission telemetry. |
| Simulation locus | Client + server share one pure function | Running it only client-side would simplify the API but break server rendering and audits; running it only server-side adds latency and load. Shared pure function gives both. |
| Map library | MapLibre GL (via react-map-gl) | Open source, no API-key requirement, performant WebGL tiles. Trade-off: slightly larger bundle vs. a hosted/closed map SDK. |
| Data fetch | Supabase REST + repository layer | Direct PostgREST keeps the app fast and lets RLS do the authorization; the repository layer keeps the rest of the app decoupled from the transport. |
| Multi-tenant design | Org-scoped rows + RLS at DB level | Slightly more schema work than a shared-flat model, but it makes cross-tenant leakage structurally impossible rather than a convention. |
| Auth | Supabase Auth, auto-confirm | Fast to stand up and secure by default. Email confirmation was intentionally disabled to avoid a delivery-rate-limited confirmation gate blocking signup during review. |
| 3D landing scene | React Three Fiber + glTF | Adds bundle weight, but delivers a premium first impression. Model is CC-BY-4.0 licensed with attribution retained. |

### Strategy for safety and adaptability

- **Security by default:** Row Level Security is enabled on every table and the trigger function is `revoke`d from anon/authenticated/public; only the database owner can run it. Anonymous reads return empty result sets. Service-role credentials are server-side only.
- **Safe defaults:** new accounts auto-provision an organization, profile, and a 3-drone starter fleet, so every feature is immediately explorable.
- **Deterministic replay:** because state is a pure function of `(plan, timeline, now)`, any mission record can be re-derived exactly — useful for audit, debugging, and future "replay a mission" features.
- **Adaptability:** the mission model is data-driven (patterns are generator functions over waypoints), so new survey patterns, altitude policies, or capture cadences are configuration, not new code paths.
- **Isolated interactivity:** client components are narrow and server components dominate, keeping the app resilient to JS failures and improving rendering performance.
- **Cleanup discipline:** dead code and unused dependencies are removed; type definitions and SOLID layering keep the surface area small and reviewable.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.local.example` → `.env.local`, fill in your project credentials (see [Environment Variables](#environment-variables)), run the `supabase/schema.sql` migration, then `npm run dev`.

## Database Schema

| Table | Purpose |
| --- | --- |
| `organizations` | Tenancy root; every other table scopes to `org_id` |
| `profiles` | User → organization membership |
| `drones` | Fleet inventory: name, status, battery, telemetry, org |
| `missions` | Plans + execution state: site, pattern, parameters, status, progress, results |
| `mission_events` | Append-only control/status timeline (pause, resume, abort, milestones) |

Key mechanics:

- `handle_new_user()` trigger: on signup, creates an org, a profile, and 3 starter drones.
- RLS policies on all tables keyed on the authenticated user's `org_id`.
- A `mission_summaries` projection exposes lightweight rows (with precomputed `waypoint_count`) for high-frequency polling without the heavy jsonb columns.

## Deployment

The application is deployed on **Vercel** (deployment URL to be added here once live).

Setup:

1. Push this repository to GitHub (private repo, per assignment requirements).
2. Import the repo in Vercel → framework preset **Next.js** → build `npm run build`.
3. Add the [environment variables](#environment-variables) in Vercel settings.
4. Deploy.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon/publishable key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role key (server/admin only — never expose) |
| `SUPABASE_DB_URL` | optional | Direct Postgres connection string for local tooling |
