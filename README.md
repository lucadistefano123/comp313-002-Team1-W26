# MindSync Auth (COMP313 Team 1)

Full-stack web app for authentication, mood check-ins, journaling, clinician workflows, admin controls, and data export.

## Repository Layout

- `mindsync-auth/client`: React + Vite frontend
- `mindsync-auth/server`: Express + MongoDB backend
- `mindsync-auth`: Root scripts that run client/server together

## Existing Documentation

- This file is the main repository guide.
- `mindsync-auth/client/README.md` contains frontend-focused setup notes.
- `mindsync-auth/server/README.md` contains backend-focused setup notes.

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or remote)

## Quick Start

1. Install dependencies:

	- `cd mindsync-auth`
	- `npm install`
	- `npm --prefix client install`
	- `npm --prefix server install`

2. Create environment file:

	- Create `mindsync-auth/server/.env`
	- Add at least:
	  - `MONGO_URI=mongodb://127.0.0.1:27017/mindsync`
	  - `JWT_SECRET=replace_with_strong_secret`
	  - `PORT=5000`
	  - `CLIENT_URL=http://localhost:5173`

3. Run both client and server (single command):

	- From `mindsync-auth`: `npm run dev`

4. Open the app:

	- App URL: `http://localhost:5000`
	- Health check: `http://localhost:5000/api/health`

5. Optional (separate frontend dev server with Vite):

	- Terminal 1: from `mindsync-auth/server` run `npm run dev`
	- Terminal 2: from `mindsync-auth/client` run `npm run dev`
	- Frontend URL in this mode: `http://localhost:5173`

## Scripts

From `mindsync-auth`:

- `npm run dev`: Runs both services from `mindsync-auth` by building frontend in watch mode and running backend with nodemon
- `npm run build`: Builds frontend production assets
- `npm start`: Starts backend (`server/src/server.js`) and serves `client/dist`

## Main API Groups

- `/api/auth`: register, login, me, logout
- `/api/moods`: create/check history
- `/api/clinician`: patient assignment and notes
- `/api/admin`: user management, role changes, audit logs, system metrics
- `/api/flags`: feature flags
- `/api/export`: user export

## Notes

- Auth uses an HTTP-only cookie named `token`.
- Feature flags are seeded on server startup.
- In production mode, backend serves the built frontend from `client/dist`.

## Platform Metrics (Admin)

Platform administrators can monitor aggregate system usage metrics for stability and performance.

- Login frequency
- Feature usage
- System error counts

The detailed backend contract, privacy constraints, endpoint behavior, and tests are documented in `mindsync-auth/server/README.md` under System Metrics sections.