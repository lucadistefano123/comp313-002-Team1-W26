# MindSync Client

Frontend for the MindSync application.

## Stack

- React 19
- Vite 7
- Recharts (mood history visualization)

## Local Development

1. Install dependencies:

	- `cd mindsync-auth/client`
	- `npm install`

2. Start dev server:

	- `npm run dev`

3. Open:

	- `http://localhost:5173`

## Build and Preview

- Build: `npm run build`
- Preview build: `npm run preview`
- Lint: `npm run lint`

## API Integration

- Frontend API base is `/api` (see files in `src/api`).
- During development, backend should run on port 5000.
- During production, backend serves the compiled frontend from `client/dist`.

## Key Pages

- Login / Register
- Mood Check-In and Mood History
- Journal
- Clinician Dashboard
- Admin Dashboard

For full project setup and server environment variables, see repository README at the workspace root.
