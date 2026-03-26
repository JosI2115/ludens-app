# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ludens App is a tutoring academy management system (Spanish-language domain). It manages students (alumnos), payments (pagos), attendance (asistencias), staff (usuarios), and branches (sucursales).

## Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload          # Dev server on :8000
uvicorn app.main:app --host 0.0.0.0 --port $PORT # Production
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev      # Dev server on :5173 (proxies /api → localhost:8000)
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Database
The backend requires a running PostgreSQL instance. Tables and seed data (4 branches, 15 default users) are created automatically on startup via `metadata.create_all()` in `main.py`.

Local connection: `postgresql://postgres:jesus2115@localhost:5433/ludens_db`

Migrations use Alembic (`backend/alembic/`).

## Architecture

**Monorepo:** `backend/` (Python/FastAPI) + `frontend/` (React/Vite)

**Deployment:** Render.com — backend at `https://ludens-backend.onrender.com`, configured via `backend/render.yaml`.

### Backend Structure

- `app/main.py` — FastAPI app init, CORS, router registration, startup seeding
- `app/database.py` — SQLAlchemy engine + session (`get_db` dependency)
- `app/auth/auth.py` — JWT creation/validation, bcrypt password hashing
- `app/models/` — SQLAlchemy ORM models
- `app/routers/` — API route handlers (one file per domain)

**Auth:** JWT tokens, 480-minute expiry, stored in `localStorage` on frontend. Env vars: `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` (from `backend/.env`).

**Role hierarchy:** directora > encargada > maestra > recepcionista > contadora. The Layout sidebar filters menu items by role.

### Frontend Structure

- `src/App.jsx` — React Router setup with `PrivateRoute` HOC (checks `localStorage` token, redirects to `/login` on 401)
- `src/services/api.js` — Axios instance; auto-injects `Bearer` token; base URL from `VITE_API_URL` env var
- `src/components/Layout.jsx` — Sidebar navigation
- `src/pages/` — One file per route

**API base URL:** set via `VITE_API_URL`. In production: `https://ludens-backend.onrender.com` (from `frontend/.env.production`). In dev, Vite proxies `/api` to `localhost:8000`.

### Key Domain Models

- **Alumno** (Student): academic info, personal details, `situacion` (prospecto/activo/baja), `plan_pago`, sibling discount support. Belongs to Sucursal and Maestra.
- **Pago** (Payment): monthly payment records with color-coded penalty status (amarillo/rojo/naranja/cafe) based on days overdue.
- **Asistencia** (Attendance): daily records per student.
- **HistorialCambio** (Audit log): records every field change to student records.
- **Sucursal** (Branch): 4 locations (El Fresno, San Cristóbal, Jardines de la Paz, Valle Real).

### Code Conventions

- Domain field/variable names are in Spanish throughout (frontend and backend).
- Pydantic v1 is used (`pydantic==1.10.13`) — use v1 syntax (not v2).
- No TypeScript — frontend is plain JavaScript.
