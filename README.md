# Pixelkode OS

Private business operating dashboard for Pixelkode.

## Features

- Single-owner login using `APP_USERNAME` and `APP_PASSWORD`
- Dashboard with charts and summaries driven by your entered business data
- Spreadsheet-style business sheets for:
  - Projects
  - Leads
  - Revenue
  - Team
  - Content
  - Services
- Data stored in PostgreSQL through `/api/business-state`
- Route protection for all private pages and API access

## Local setup

1. Run `npm install`
2. Copy `.env.example` to `.env.local`
3. Fill in:

```env
APP_USERNAME=your-admin-username
APP_PASSWORD=your-strong-admin-password
DATABASE_URL=postgresql://postgres:password@host:port/railway
```

4. Start the app with `npm run dev`

## Production build

- Build: `npm run build`
- Start: `npm run start`

## Render deploy

This repo includes a [render.yaml](/abs/c:/PixelKode-Operations/render.yaml:1) blueprint.

Use these settings in Render:

1. Push this code to GitHub.
2. In Render, create a new `Blueprint` or `Web Service` from that repo.
3. Render will use:
   - Build command: `npm ci && npm run build`
   - Start command: `npm run start`
   - Health check path: `/login`
4. Add these environment variables in Render:
   - `APP_USERNAME`
   - `APP_PASSWORD`
   - `DATABASE_URL`
5. Deploy.

## Database

- The app now reads and writes business data through PostgreSQL.
- `DATABASE_URL` is required for production.
- API reads/writes are protected by login session checks.
