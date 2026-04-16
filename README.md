# Flux Engineering Hub

> Full-stack monorepo platform for **Flux Mecatrónica** — integrating PCB production traceability with administrative management under a single unified interface.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation Guide](#installation-guide)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Running Tests](#running-tests)
- [Build](#build)

---

## Project Overview

Flux Engineering Hub is a modular platform composed of **5 integrated applications**:

| App | Route | Description |
|-----|-------|-------------|
| **Dashboard** | `/dashboard` | Main entry point with quick navigation cards to all apps |
| **G-Code Tool** | `/gcode` | Concatenate and filter CNC `.nc` / `.gcode` files |
| **Clients** | `/clients` | Customer CRUD — name, company, contact details |
| **Orders** | `/orders` | PCB orders linked to clients, with version tracking (V1, V2.1, …) |
| **Machining Sessions** | `/cnc-reports` | CNC machining session logging, failure reports, and PDF export |
| **Flux Scheduler** | `/scheduler` | Weekly calendar with Google Calendar OAuth2 sync |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 18, TypeScript, Tailwind CSS |
| **Backend** | Go 1.21+, Fiber v2 |
| **Database** | PostgreSQL 15+ |
| **ORM / DB Driver** | pgx v5 (pgxpool) |
| **Calendar** | react-big-calendar + moment.js |
| **Forms** | React Hook Form |
| **PDF Generation** | gofpdf |
| **Auth** | Google OAuth2 (golang.org/x/oauth2) |
| **Container** | Docker + Docker Compose |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js 15 Frontend  (port 3000)                                       │
│  /dashboard · /gcode · /clients · /orders · /cnc-reports · /scheduler  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ HTTP/JSON
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Go + Fiber Backend  (port 8080)                                        │
│  /api/process          — G-Code merge & filter                          │
│  /api/scheduler/*      — Meetings CRUD + Google Calendar OAuth2         │
│  /api/cnc/*            — Clients, Orders, Machining Sessions, PDF       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
                     PostgreSQL  (port 5432)
                     Tables: meetings · clients · pcb_versions
                             machining_sessions
```

### Directory Structure

```
flux-hub/
├── backend/
│   ├── cmd/main.go                    # Fiber HTTP server + route registration
│   └── internal/
│       ├── database/db.go             # pgxpool connection + schema migration
│       ├── calendar/handler.go        # Google Calendar OAuth2 + meetings CRUD
│       ├── reports/handler.go         # Clients/Orders/Sessions CRUD + PDF generation
│       ├── parser/parser.go           # G-Code line parser
│       ├── filter/filter.go           # M0/M6 command filter
│       └── merger/merger.go           # Multi-file merger
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/page.tsx     # Main dashboard with 5 app cards
│       │   ├── gcode/page.tsx         # G-Code processing tool
│       │   ├── clients/page.tsx       # Client management (CRUD)
│       │   ├── orders/page.tsx        # Order management (CRUD)
│       │   ├── cnc-reports/page.tsx   # Machining sessions + PDF export
│       │   └── scheduler/page.tsx     # Calendar + Google OAuth setup guide
│       ├── components/
│       │   ├── Sidebar.tsx            # Collapsible navigation sidebar
│       │   ├── scheduler/
│       │   │   ├── CalendarView.tsx   # react-big-calendar (dark theme)
│       │   │   └── EventModal.tsx     # Create / Edit meeting modal
│       │   └── cnc-reports/
│       │       ├── SessionForm.tsx    # Create machining session form
│       │       └── UpdateSessionModal.tsx  # Update active session + failure report
│       └── services/
│           ├── api.ts                 # G-Code API calls
│           ├── schedulerApi.ts        # Scheduler API calls
│           └── cncApi.ts              # CNC Reports API calls
├── assets/                            # Sample .nc files
├── Makefile
├── docker-compose.yml
└── README.md
```

---

## Installation Guide

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Go | 1.21 |
| Node.js | 18 |
| Docker | 24 |
| Docker Compose | 2.x |
| PostgreSQL | 15 (or via Docker) |

---

### Option A — Local Development (DB via Docker)

```bash
# 1. Clone the repository
git clone https://github.com/Deivs117/GcodeApp.git
cd GcodeApp

# 2. Start PostgreSQL
make db-up

# 3. Start the backend (in one terminal)
make run-back   # → http://localhost:8080

# 4. Install frontend dependencies and start Next.js (in another terminal)
cd frontend && npm install && cd ..
make run-front  # → http://localhost:3000
```

Or start both simultaneously (requires DB already running):

```bash
make dev
```

---

### Option B — Full Docker Stack

```bash
make docker-up
# → Frontend:  http://localhost:3000
# → Backend:   http://localhost:8080
# → Database:  localhost:5432  (user: flux / password: flux / db: fluxhub)
```

> The backend automatically runs schema migrations on startup — no manual SQL required.

---

## Environment Variables

Create a `.env` file in the project root (used by `docker-compose`). The backend reads these directly at startup.

```env
# ── Database ─────────────────────────────────────────────────────────────────
DB_HOST=localhost          # PostgreSQL host
DB_PORT=5432               # PostgreSQL port
DB_USER=flux               # PostgreSQL user
DB_PASSWORD=flux           # PostgreSQL password
DB_NAME=fluxhub            # Database name
DATABASE_URL=              # Optional: full DSN — overrides the individual DB_* vars

# ── Google Calendar OAuth2 ────────────────────────────────────────────────────
# Obtain these from https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID=          # OAuth2 Client ID
GOOGLE_CLIENT_SECRET=      # OAuth2 Client Secret
GOOGLE_REDIRECT_URL=http://localhost:8080/api/scheduler/oauth-callback

# ── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=*          # Comma-separated allowed origins (default: *)

# ── Frontend ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8080   # Backend base URL (Next.js env var)
```

### Variable Reference

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DB_HOST` | `localhost` | Yes | PostgreSQL host |
| `DB_PORT` | `5432` | Yes | PostgreSQL port |
| `DB_USER` | `flux` | Yes | PostgreSQL username |
| `DB_PASSWORD` | `flux` | Yes | PostgreSQL password |
| `DB_NAME` | `fluxhub` | Yes | Database name |
| `DATABASE_URL` | — | No | Full connection DSN; overrides individual DB vars |
| `GOOGLE_CLIENT_ID` | — | No* | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | — | No* | Google OAuth2 Client Secret |
| `GOOGLE_REDIRECT_URL` | — | No* | OAuth2 redirect URI |
| `ALLOWED_ORIGINS` | `*` | No | CORS allowed origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | No | Backend URL for Next.js |

> \* Required only for Google Calendar sync. All other features work without these.

---

## API Documentation

### Health

```
GET /health
→ { "status": "ok" }
```

---

### G-Code Processing

```
POST /api/process                  multipart/form-data
  files[]         .nc / .gcode files to merge
  order           JSON string array — explicit merge order by filename
  filter_m0m6     "true" to strip exact M0/M6 tokens (M03, M04, M06 are preserved)

→ { mergedContent: string, fileCount: number, ... }
```

---

### Scheduler — Meetings

```
GET    /api/scheduler/auth-url
→ { url: string }  — Google OAuth2 authorization URL

GET    /api/scheduler/oauth-callback?code=...
→ { token: string, message: string }  — OAuth2 token exchange

GET    /api/scheduler/meetings
→ Meeting[]

POST   /api/scheduler/meetings
  Body: { title, description, startTime (RFC3339), endTime (RFC3339), attendees[] }
  Header: X-Google-Token  (optional — enables Google Calendar sync)
→ { id, googleEventId, message }

GET    /api/scheduler/meetings/:id
→ Meeting

PUT    /api/scheduler/meetings/:id
  Body: { title, description, startTime, endTime, attendees[] }
→ { message: "Meeting updated" }

DELETE /api/scheduler/meetings/:id
→ { message: "Meeting deleted" }
```

---

### CNC — Clients

```
GET    /api/cnc/clients
→ Client[]

POST   /api/cnc/clients
  Body: { name*, company, contact, email }
→ { id }

PUT    /api/cnc/clients/:id
  Body: { name*, company, contact, email }
→ { message: "Client updated" }

DELETE /api/cnc/clients/:id
→ { message: "Client deleted" }
```

---

### CNC — Orders (PCB Versions)

```
GET    /api/cnc/pcb-versions[?clientId=...]
→ PcbVersion[]

POST   /api/cnc/pcb-versions
  Body: { version*, orderNumber, clientId* }
→ { id }

PUT    /api/cnc/pcb-versions/:id
  Body: { version*, orderNumber, clientId }
→ { message: "Order updated" }

DELETE /api/cnc/pcb-versions/:id
→ { message: "Order deleted" }
```

---

### CNC — Machining Sessions

```
GET    /api/cnc/sessions
→ MachiningSession[]  (joined with client name and order version)

POST   /api/cnc/sessions
  Body: { clientId, pcbVersionId, units*, status, tracksTimeSec,
          drillsTimeSec, cutoutTimeSec, failureNotes }
→ { id }

PUT    /api/cnc/sessions/:id
  Body: { status*, units*, tracksTimeSec, drillsTimeSec, cutoutTimeSec,
          failureNotes (required when status="failed") }
→ { message: "Session updated" }

DELETE /api/cnc/sessions/:id
→ { message: "Session deleted" }

GET    /api/cnc/sessions/:id/pdf
→ application/pdf  — Professional PDF report for the session
```

> Fields marked `*` are required.

---

## Running Tests

```bash
make test
# Runs 11 unit tests across the filter and merger packages — all PASS
```

---

## Build

```bash
make build
# → Go binary:    build/flux-gcode-api
# → Next.js app:  frontend/.next
```

### Other Makefile targets

```bash
make dev          # Start backend + frontend concurrently (requires DB running)
make run-back     # Backend only
make run-front    # Frontend only
make db-up        # Start PostgreSQL via Docker Compose
make db-down      # Stop PostgreSQL
make docker-up    # Full Docker stack (backend + frontend + DB)
make lint         # go fmt + next lint
make clean        # Remove build artifacts
```

---

*Flux Mecatrónica © 2025*

