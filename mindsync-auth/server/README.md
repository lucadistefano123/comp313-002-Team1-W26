# MindSync Server

Backend API for authentication, mood tracking, clinician/admin workflows, and export.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- Cookie-based JWT authentication

## Local Development

1. Install dependencies:

   - `cd mindsync-auth/server`
   - `npm install`

2. Create `.env` in this folder with at least:

   - `MONGO_URI=mongodb://127.0.0.1:27017/mindsync`
   - `JWT_SECRET=replace_with_strong_secret`
   - `PORT=5000`
   - `CLIENT_URL=http://localhost:5173`

3. Start server:

   - Dev: `npm run dev`
   - Prod: `npm start`

## Optional Environment Flags

- `ALLOW_PUBLIC_ADMIN=true`
- `ALLOW_PUBLIC_CLINICIAN=true`

Use these only for local testing if you want role assignment during registration.

## Main Route Groups

- `/api/health`
- `/api/auth`
- `/api/moods`
- `/api/clinician`
- `/api/admin`
- `/api/flags`
- `/api/export`

## Security Notes

- Auth token is stored in an HTTP-only cookie (`token`).
- Global and export-specific rate limiting are enabled.
- Helmet security headers are enabled.

## System Metrics Scope

The platform admin system metrics are intentionally aggregate-only and privacy-safe.

- `login_frequency`: count of successful logins per day
- `feature_usage`: count of feature interactions per day, grouped by feature key
- `error_count`: count of server-side errors per day, grouped by error category

Privacy constraints for all metrics:

- No user-identifiable fields (no `userId`, `email`, `fullName`, token, or request payload)
- No raw IP address or raw user agent storage
- API responses must return only aggregated counts and categories

Canonical code definitions live in `src/metrics/metricDefinitions.js`.
