# G-Code Flux-Processor

**English** | [Español](#español)

A full-stack web application for concatenating and filtering CNC G-Code / NC files. Upload multiple files, reorder them, optionally strip exact `M0`/`M6` commands, and download the merged result.

---

## Architecture

```
┌─────────────────────┐        HTTP/JSON        ┌──────────────────────┐
│  Next.js 14 Frontend│ ──────────────────────► │  Go + Fiber Backend  │
│  (port 3000)        │  POST /api/process       │  (port 8080)         │
│  Tailwind CSS       │  multipart/form-data     │  parser / filter /   │
│  TypeScript         │                          │  merger packages     │
└─────────────────────┘                          └──────────────────────┘
```

### Directory structure

```
gcode-flux-processor/
├── backend/
│   ├── cmd/main.go            # Fiber HTTP server
│   ├── internal/
│   │   ├── parser/parser.go   # bufio line parser
│   │   ├── filter/filter.go   # M0/M6 filter logic
│   │   └── merger/merger.go   # file merger
│   └── pkg/models/gcode.go    # shared types
├── frontend/
│   └── src/
│       ├── app/               # Next.js App Router pages
│       ├── components/        # Dropzone, FileList, ProcessToggle
│       └── services/api.ts    # fetch wrapper
├── assets/                    # sample .nc files (PCB1–PCB5)
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
| Docker & Docker Compose | 24+ (optional) |

---

## Quick Start

### Development (local)

```bash
# Backend only
make run-back

# Frontend only
make run-front

# Both together (background processes)
make dev
```

### Docker

```bash
make docker-up
# → Backend:  http://localhost:8080
# → Frontend: http://localhost:3000
```

### Tests

```bash
make test
```

### Build

```bash
make build
# Binary → build/flux-gcode-api
# Next.js → frontend/.next
```

---

## API Documentation

### `GET /health`

Returns server health status.

**Response 200:**
```json
{ "status": "ok" }
```

---

### `POST /api/process`

Process and merge G-Code files.

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `files[]` | file (multiple) | `.nc` or `.gcode` files to process |
| `order` | string (JSON array) | e.g. `["PCB1.nc","PCB2.nc"]` — defines merge order |
| `filter_m0m6` | string | `"true"` to strip exact `M0` / `M6` tokens |

**Response 200:**
```json
{
  "output": "G00 X0 Y0\nG01 X10...",
  "totalLines": 1240,
  "filteredLines": 8,
  "fileName": "resultado_unido.nc"
}
```

**Filter rules:**
- Only the **exact** tokens `M0` and `M6` are removed (case-insensitive first token).
- `M03`, `M04`, `M06`, `M00` are **preserved**.

---

## Running Tests

```bash
cd backend && go test ./... -v
```

Expected output: 11 tests across `filter` and `merger` packages — all PASS.

---

---

## Español

# G-Code Flux-Processor

Aplicación web full-stack para concatenar y filtrar archivos CNC G-Code / NC. Carga múltiples archivos, reordénalos, elimina opcionalmente los comandos exactos `M0`/`M6` y descarga el resultado fusionado.

---

## Arquitectura

```
Frontend Next.js 14 (puerto 3000)  ──►  Backend Go + Fiber (puerto 8080)
```

El backend expone una API REST; el frontend consume esa API directamente desde el navegador.

---

## Prerequisitos

| Herramienta | Versión |
|-------------|---------|
| Go | 1.21+ |
| Node.js | 18+ |
| Docker y Docker Compose | 24+ (opcional) |

---

## Inicio rápido

```bash
# Ambos servicios en modo desarrollo
make dev

# O con Docker
make docker-up
```

---

## API

### `GET /health`
Verifica que el servidor esté activo.

### `POST /api/process`
Procesa y fusiona archivos G-Code. Acepta `multipart/form-data` con los campos `files[]`, `order` (JSON) y `filter_m0m6`.

Devuelve JSON con `output` (contenido fusionado), `totalLines`, `filteredLines` y `fileName`.

---

## Pruebas

```bash
make test
```
