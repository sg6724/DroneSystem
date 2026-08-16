# SkyGrid — Drone Survey Management System

A full-stack drone survey mission management platform for planning, monitoring, and reporting on autonomous drone surveys across an organization's fleet and sites.

**Live application:** _hosting link pending — see [Deployment](#deployment)._

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Architecture](#architecture)
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

The system is multi-tenant: each registered organization owns its fleet, missions, and data, enforced through Row Level Security (RLS).

## Features

| Area | Capabilities |
| --- | --- |
| **Auth** | Email/password sign-up with auto-confirmation, organization auto-provisioning, per-org RLS data isolation |
| **Planning** | Draw/select a survey site on a map, pick pattern (grid / crosshatch / perimeter), configure altitude, overlap %, speed, and capture frequency; choose aircraft |
| **Fleet** | Drone inventory grid with status chips, battery bars, and telemetry; live mission assignment |
| **Monitor** | Map-based live flight visualization (drone marker, planned vs. flown path), progress bar, ETA, event log, pause / resume / abort controls |
| **Analytics** | Per-mission and org-wide summaries: flight hours, distance surveyed, image capture estimates, coverage |

## Technical Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack)
- **Styling:** Tailwind CSS 4
- **Maps:** MapLibre GL (react-map-gl)
- **Backend/DB:** Supabase (Postgres + Auth), Row Level Security
- **State:** Zustand (client-side mission state)
- **Charts:** Recharts
- **Icons:** lucide-react

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

- A mission plan encodes the full flight path as a list of legs (waypoints, altitude, speed, capture cadence).
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
  components/     UI + map components (overview, fleet, survey, monitor)
  lib/            supabase clients, repository, mission-service
  lib/simulation/ deterministic engine + pattern generators
  proxy.ts        auth-aware request routing (edge)
supabase/
  schema.sql      canonical database schema + RLS + triggers
```

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

### Strategy for safety and adaptability

- **Security by default:** Row Level Security is enabled on every table and the trigger function is `revoke`d from anon/authenticated/public; only the database owner can run it. Anonymous reads return empty result sets. Service-role credentials are server-side only.
- **Safe defaults:** new accounts auto-provision an organization, profile, and a 3-drone starter fleet, so every feature is immediately explorable.
- **Deterministic replay:** because state is a pure function of `(plan, timeline, now)`, any mission record can be re-derived exactly — useful for audit, debugging, and future "replay a mission" features.
- **Adaptability:** the mission model is data-driven (patterns are generator functions over waypoints), so new survey patterns, altitude policies, or capture cadences are configuration, not new code paths.
- **Isolated interactivity:** client components are narrow and server components dominate, keeping the app resilient to JS failures and improving rendering performance.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo account:** `demo@skygrid.dev` / `SkyGridDemo123!`

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