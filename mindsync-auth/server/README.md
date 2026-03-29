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

For AI insights feature:

- `OPENAI_API_KEY=your_openai_api_key` - Required to enable mood insights generation via OpenAI GPT-4O Mini

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

## Features

### System Metrics (Admin)
Admins can monitor aggregate system usage metrics: login frequency, feature usage, and system error counts.
- Endpoint: `GET /api/admin/metrics?start=YYYY-MM-DD&end=YYYY-MM-DD`
- Run tests: `npm test`

### AI Insights (User)
Users can generate personalized mood insights using OpenAI's GPT-4O Mini model by analyzing mood patterns and requesting suggestions.
- Endpoint: `GET /api/moods/insights?days=7`
- Requires: `OPENAI_API_KEY` environment variable