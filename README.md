# Flux Engineering Hub

**English** | [Español](#español)

A full-stack monorepo platform for **Flux Mecatrónica**, combining three applications under a unified sidebar layout:

| App | Description |
|-----|-------------|
| **G-Code Tool** | Concatenate and filter CNC `.nc` / `.gcode` files |
| **Flux Scheduler** | Weekly calendar with Google Calendar OAuth2 sync |
| **CNC Reports** | PCB machining session logging with PDF export |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js 15 Frontend (port 3000)                                        │
│  Sidebar → /gcode · /scheduler · /cnc-reports                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ HTTP/JSON
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Go + Fiber Backend (port 8080)                                         │
│  /api/process          — G-Code merge & filter                          │
│  /api/scheduler/*      — Meetings CRUD + Google Calendar OAuth2         │
│  /api/cnc/*            — Machining sessions, clients, PCB versions, PDF │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
                     PostgreSQL (port 5432)
                     Tables: meetings, clients,
                             pcb_versions, machining_sessions
```

### Directory structure

```
flux-hub/
├── backend/
│   ├── cmd/main.go                    # Fiber HTTP server + route registration
│   ├── internal/
│   │   ├── database/db.go             # pgxpool connection + schema migration
│   │   ├── calendar/handler.go        # Google Calendar OAuth2 + meetings CRUD
│   │   ├── reports/handler.go         # CNC sessions CRUD + gofpdf PDF generation
│   │   ├── parser/parser.go           # bufio line parser
│   │   ├── filter/filter.go           # M0/M6 filter logic
│   │   └── merger/merger.go           # file merger
│   ├── pkg/models/gcode.go            # G-Code shared types
│   ├── go.mod
│   └── go.sum
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx             # Root layout with Sidebar
│       │   ├── page.tsx               # Redirects to /gcode
│       │   ├── gcode/page.tsx         # G-Code tool
│       │   ├── scheduler/page.tsx     # Flux Scheduler
│       │   └── cnc-reports/page.tsx   # CNC Machining Reports
│       ├── components/
│       │   ├── Sidebar.tsx            # App navigation sidebar
│       │   ├── Dropzone.tsx           # File drag-and-drop
│       │   ├── FileList.tsx           # Ordered file list
│       │   ├── ProcessToggle.tsx      # Toggle switch
│       │   ├── scheduler/
│       │   │   ├── CalendarView.tsx   # react-big-calendar wrapper
│       │   │   └── EventModal.tsx     # New-meeting form modal
│       │   └── cnc-reports/
│       │       └── SessionForm.tsx    # Machining session form
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

## Prerequisites

| Tool | Version |
|------|---------|
| Go | 1.21+ |
| Node.js | 18+ |
| Docker & Docker Compose | 24+ |
| PostgreSQL | 15+ (or run via Docker) |

---

## Quick Start

### 1. Development (local, with DB via Docker)

```bash
# Start PostgreSQL only
make db-up

# In separate terminals:
make run-back   # → http://localhost:8080
make run-front  # → http://localhost:3000
```

Or start everything in one command (requires DB already running):

```bash
make dev
```

### 2. Full Docker Stack

```bash
make docker-up
# → Backend:  http://localhost:8080
# → Frontend: http://localhost:3000
# → DB:       localhost:5432 (flux/flux/fluxhub)
```

### 3. Environment Variables

For development, create a `.env` file in the project root (used by `docker-compose`):

```bash
# Required for Google Calendar sync (optional — app works without it)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/api/scheduler/oauth-callback
```

Backend reads these env vars directly:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `flux` | PostgreSQL user |
| `DB_PASSWORD` | `flux` | PostgreSQL password |
| `DB_NAME` | `fluxhub` | Database name |
| `DATABASE_URL` | — | Full DSN (overrides above) |
| `GOOGLE_CLIENT_ID` | — | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth2 secret |
| `GOOGLE_REDIRECT_URL` | — | OAuth2 redirect URI |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins |

---

## Apps

### 🛠️ G-Code Tool (`/gcode`)

Upload multiple `.nc` or `.gcode` files, drag-and-drop to reorder, optionally strip exact `M0`/`M6` commands (tokenized comparison — `M03`, `M04`, `M06` are preserved), then download the merged result.

### 🗓️ Flux Scheduler (`/scheduler`)

- **Weekly calendar** with `react-big-calendar` (month/week/day views)
- **Today highlighted** automatically
- **Double-click / slot select** on any time slot opens the "New Meeting" modal with pre-filled times
- **Attendees** — add email addresses; they will receive Google Calendar invitations if OAuth2 is configured
- **Google Calendar sync** — click "Connect Google", authorise, paste the returned token; new meetings are automatically pushed to the primary calendar
- **Persistent** — all meetings are stored in PostgreSQL

### 📋 CNC Machining Reports (`/cnc-reports`)

- **New Session** form (React Hook Form) with fields for client, PCB version, units, status, Tracks/Drills/Cutout time, and failure notes
- **Status workflow**: Por empezar → Maquinando → Finalizado (click status badge to advance)
- **PDF export** — click the download icon on any session; generates `YYYYMMDD_Client_Version.pdf` using `gofpdf` on the backend
- **Failure notes** — shown when status is "Fallo"; provides structured data for future AI vision model training

---

## API Reference

### Health

```
GET /health → { "status": "ok" }
```

### G-Code Processing

```
POST /api/process   multipart/form-data
  files[]           .nc / .gcode files
  order             JSON string array — merge order
  filter_m0m6       "true" to strip exact M0/M6 tokens
```

### Scheduler

```
GET    /api/scheduler/auth-url          → { url }
GET    /api/scheduler/oauth-callback    OAuth2 redirect handler
GET    /api/scheduler/meetings          → Meeting[]
POST   /api/scheduler/meetings          Create meeting (X-Google-Token header for sync)
GET    /api/scheduler/meetings/:id      → Meeting
DELETE /api/scheduler/meetings/:id      Delete
```

### CNC Reports

```
GET    /api/cnc/clients                 → Client[]
POST   /api/cnc/clients                 Create client
GET    /api/cnc/pcb-versions            → PcbVersion[]  (?clientId=...)
POST   /api/cnc/pcb-versions            Create PCB version
GET    /api/cnc/sessions                → MachiningSession[]
POST   /api/cnc/sessions                Create session
PUT    /api/cnc/sessions/:id            Update session (status, times, notes)
DELETE /api/cnc/sessions/:id            Delete
GET    /api/cnc/sessions/:id/pdf        Download PDF report
```

---

## Tests

```bash
make test
# 11 tests across filter + merger packages — all PASS
```

---

## Build

```bash
make build
# Binary → build/flux-gcode-api
# Next.js → frontend/.next
```

---

---

## Español

# Flux Engineering Hub

Monorepo full-stack para **Flux Mecatrónica** con tres apps bajo un layout de barra lateral unificada:

| App | Descripción |
|-----|-------------|
| **G-Code Tool** | Concatenar y filtrar archivos CNC `.nc` / `.gcode` |
| **Flux Scheduler** | Calendario semanal con sincronización Google Calendar (OAuth2) |
| **CNC Reports** | Registro de sesiones de maquinado con exportación PDF |

---

## Arquitectura

```
Frontend Next.js 15 (puerto 3000)
  Sidebar → /gcode · /scheduler · /cnc-reports
     │
     ▼
Backend Go + Fiber (puerto 8080)
  /api/process · /api/scheduler/* · /api/cnc/*
     │
     ▼
PostgreSQL (puerto 5432)
```

---

## Inicio rápido

```bash
# Solo PostgreSQL vía Docker, resto local:
make db-up
make run-back   # http://localhost:8080
make run-front  # http://localhost:3000

# Todo con Docker:
make docker-up
```

---

## Apps

### G-Code Tool
Carga archivos `.nc`/`.gcode`, reordénalos, filtra comandos `M0`/`M6` exactos y descarga el resultado fusionado.

### Flux Scheduler
Vista semanal (`react-big-calendar`), día actual resaltado, doble clic en franja → modal de creación con horario pre-rellenado, soporte de invitados por correo e integración Google Calendar vía OAuth2. Persistencia en PostgreSQL.

### CNC Reports
Formulario (React Hook Form) con campos de Cliente, Versión PCB, Unidades, Estado (Por empezar / Maquinando / Fallo / Finalizado), tiempos de Pistas/Drills/Cutout y notas de fallo. Generación de PDF `FECHA_CLIENTE_VERSION.pdf` vía `gofpdf` en el backend.

---

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | Host PostgreSQL |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `flux/flux/fluxhub` | Credenciales |
| `GOOGLE_CLIENT_ID` | — | OAuth2 Google |
| `GOOGLE_CLIENT_SECRET` | — | OAuth2 Google |
| `GOOGLE_REDIRECT_URL` | — | URI de redirección OAuth2 |

---

## Pruebas

```bash
make test
```

11 pruebas unitarias en los paquetes `filter` y `merger` — todas PASAN.

