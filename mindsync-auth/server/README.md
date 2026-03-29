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

## System Metrics Implementation

Metrics events are written to `SystemMetricEvent` and then aggregated for admin reporting.

Tracking points:

- Successful login records `auth.login.success`
- Successful feature requests record `feature.used`
- Any `5xx` response records `system.error`

Feature usage keys currently tracked at route-group level:

- `moods`
- `export`
- `clinician`
- `admin`
- `feature_flags`

Error categories are normalized by API group and status code (for example: `api.admin.http_500`).

## System Metrics API (Admin)

`GET /api/admin/metrics?start=YYYY-MM-DD&end=YYYY-MM-DD`

Returns aggregate-only data:

- `range`: start/end date
- `totals`: loginFrequency, featureUsage, errorCount
- `daily`: per-day counts for each metric family
- `featureUsageByKey`: grouped totals by feature key
- `errorCountByCategory`: grouped totals by error category

Behavior:

- If no usage exists in a selected period, totals are `0` and arrays are empty/zero-filled
- Date range validation enforces `end >= start` and a maximum range of 365 days

## Dashboard Integration

Admin dashboard pulls and displays system metrics alongside existing trend panels.

- Backend route: `src/routes/admin.routes.js`
- Aggregation service: `src/services/metrics.service.js`
- Dashboard API client: `../client/src/api/adminApi.js`
- Dashboard UI: `../client/src/pages/AdminDashboard.jsx`

## Metrics Test Cases

The user story test cases are automated using the Node test runner:

- Active usage -> metrics update
- No usage -> zero values shown
- System error -> error logged

Run tests:

- From `mindsync-auth/server`: `npm test`

Current metrics tests:

- `test/metrics.service.test.js`
- `test/errorMetrics.middleware.test.js`
