# Falcon Eye

**Satellite Intelligence & Environmental Monitoring Platform**

Falcon Eye is a map-first web application for selecting Areas of Interest (AOIs), running supported satellite analyses, reviewing measured results, and retaining a reproducible history. It combines a Node.js/Express API, a responsive vanilla-JavaScript interface, PostgreSQL/PostGIS persistence, Leaflet mapping, and a centralized Google Earth Engine adapter.

Falcon Eye never substitutes fabricated analysis output when a dependency or processing method is unavailable.

## 2026-10-05

### Frontend

- Enhanced the existing homepage with a locally optimized NASA Blue Marble Earth texture, three truthful dataset callouts, restrained multi-orbit styling, animated observation-path particles, and a more recognizable satellite antenna.
- Added authentic NASA/USGS-derived remote-sensing imagery to the existing dynamic capability cards while preserving capability names, descriptions, datasets, and statuses from the backend registry.
- Refined card depth, hover zoom, attribution badges, and planned/configuration-required status presentation without adding synthetic analysis results.

### Performance

- Kept imagery local and compressed: the Earth texture is approximately 227 KiB and the four lazy-loaded capability images total approximately 363 KiB.
- Retained mobile geometry and particle reductions, capped WebGL pixel ratio, visibility pausing, reduced-motion behavior, and a static-image WebGL fallback.

### Verified

- Existing API integration, Leaflet behavior, backend services, database code, and Earth Engine processing remain unchanged.
- Existing lint and automated test suites were executed after the enhancement.

## 2026-10-04

### Improved

- Redesigned Falcon Eye into a responsive dark satellite-intelligence interface.
- Added a Three.js-powered Earth, orbital satellite, atmospheric glow, geographic nodes, arcs, and adaptive particle field.
- Added GSAP entrance, scroll-reveal, card, and micro-interaction motion.
- Added Lenis smooth scrolling on the homepage without affecting Leaflet map interactions.
- Added interactive capability cards, consistent text truncation, real capability statistics, loading skeletons, and stronger empty states.
- Improved the dashboard, results presentation, history cards, floating map telemetry, and mobile Satellite Explorer layout.

### Performance

- Added reduced-motion handling, mobile/tablet scene simplification, capped device pixel ratio, tab-visibility pausing, responsive resizing, and WebGL resource disposal.
- Added a CSS Earth fallback for unavailable WebGL and avoided loading the 3D runtime on application/map pages.

### Verified

- Existing public map and API workflows remain functional through automated smoke coverage.
- Responsive desktop and mobile layouts were visually inspected in a Chromium browser.
- Existing lint and automated test suites were executed successfully.

## Approved MVP scope and capability registry

The approved MVP in `PRD.md` is Sentinel-2 vegetation monitoring and two-period NDVI change detection. The authenticated dashboard's **new analysis** flow offers vegetation with Sentinel-2 and requires two date ranges. The result workspace presents both period layers, the common-pixel NDVI change layer, backend statistics, charts, and a PDF report.

The backend still contains processors and registry entries from the earlier broader application. The registry remains useful for historical records and compatibility, but those methods are outside the approved MVP. Deforestation, flood detection, urban change, burned area, and infrastructure detection remain planned and must not be treated as implemented. `GET /api/v1/capabilities` reports registry status; it does not change the narrower dashboard scope.

The dashboard hides non-MVP methods for new analyses. The generic authenticated analysis API still accepts some previously supported processor IDs when called directly; this stabilization preserves that existing behavior. Treat those methods as outside the approved MVP workflow until their API scope is separately narrowed.

## Features

- Responsive public homepage and interface-only Satellite Explorer
- Leaflet map with pan, zoom, live coordinates, polygon/rectangle draw, edit, delete, fit, preview, copy, and GeoJSON export
- Session registration, login, logout, protected routes, normalized email, bcrypt password hashing, CSRF protection, and password change
- Ownership-scoped saved AOIs with view, load, rename, update, and delete actions
- New analysis restricted to the approved vegetation/Sentinel-2 two-period workflow, with AOI/date validation
- Non-blocking in-process analysis jobs with `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, and `CANCELLED` states
- Paginated, filterable analysis history and immutable reruns that create new jobs
- Scientific result workspace with layers, legends, charts, methodology, and processing metadata
- Completed-analysis-only PDF reports
- Versioned JSON API with compatibility aliases, request IDs, rate limits, safe errors, and structured request logs
- Separate liveness and dependency-readiness views

## Technology

- Node.js 20+ and Express 4
- PostgreSQL and PostGIS via `pg`
- Google Earth Engine through `@google/earthengine`
- Leaflet, Leaflet Draw, OpenStreetMap, and Chart.js
- Three.js for the isolated homepage Earth/orbital scene
- GSAP and ScrollTrigger for entrance, reveal, and micro-interaction motion
- Lenis for homepage-only smooth scrolling
- HTML5, CSS3, and browser-native ES modules
- Node test runner, Supertest, and ESLint

## Visual imagery attribution

- Earth texture: NASA Earth Observatory, Blue Marble: Next Generation (MODIS), January 2004.
- Vegetation visual: NASA/Goddard Space Flight Center Scientific Visualization Studio, Terra MODIS global surface reflectance.
- Water visual: NASA/USGS, Landsat 9 first-light observation of Detroit, Lake Erie, and Lake St. Clair.
- Land-cover visual: Boston University and NASA Goddard Space Flight Center, Terra MODIS land-cover classification.
- Urban visual: NASA Earth Observatory imagery by Lauren Dauphin using USGS Landsat data, Cairo, September 5, 2019; public-domain copy obtained through Wikimedia Commons.

These assets are decorative capability context only. They are not Falcon Eye analysis results.

## Architecture

```text
Browser
  ├─ public Explorer (no account required)
  └─ authenticated workspace
          ↓
Express API (/api/v1)
  ├─ authentication / CSRF / rate limits
  ├─ validation and ownership checks
  ├─ areas, history, reports, health
  └─ analysis job lifecycle
          ↓
Analysis service
          ↓
Earth Engine analysis adapter
          ↓
Central Earth Engine client + dataset registry
```

The frontend and API are served by one Node process. Earth Engine initialization exists only in `src/services/earth-engine/client.js`; controllers do not authenticate or initialize the SDK directly.

The current job runner is deliberately infrastructure-light: a request persists a `PENDING` record, returns HTTP 202, and schedules processing in the Node process. This prepares the status/polling contract for a durable queue later. It is not a durable distributed worker—process restarts can interrupt active work.

## Local setup

Requirements:

- Node.js 20 or newer
- npm
- Optional: PostgreSQL with PostGIS for accounts and persistence
- Optional: an authorized Google Earth Engine service account for satellite processing

Install and start:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The public homepage and interface-only Satellite Explorer can start without PostgreSQL or Earth Engine. The authenticated dashboard, accounts, saved areas, persistent analysis history, and report downloads require PostgreSQL with PostGIS. Actual satellite analysis also requires Earth Engine configuration.

For a local `.env` file, copy the example and fill in only the services you intend to use:

```powershell
Copy-Item .env.example .env
```

## Environment configuration

Copy `.env.example` to `.env` and change only the features you are enabling.

```env
NODE_ENV=development
PORT=3000
MAX_AOI_AREA_KM2=10000

DATABASE_URL=
SESSION_SECRET=replace-with-a-long-random-secret

EARTH_ENGINE_ENABLED=false
GOOGLE_CLOUD_PROJECT=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_APPLICATION_CREDENTIALS=

LOG_LEVEL=info
```

When `EARTH_ENGINE_ENABLED=false`, Google variables are optional and the application can start without Earth Engine. To enable processing, set `EARTH_ENGINE_ENABLED=true`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_APPLICATION_CREDENTIALS` to the path of a service-account JSON file stored outside the repository. The service account must be authorized for Earth Engine and the project must have Earth Engine access. Missing settings or initialization failures are reported as unavailable/error states; no analysis result is fabricated. Never commit `.env`, PEM/key files, or service-account JSON.

Production additionally requires a private, randomly generated `SESSION_SECRET` of at least 32 characters and a working `DATABASE_URL`. The development/example placeholders are rejected in production. Secure cookies are enabled automatically with `NODE_ENV=production`.

## Database and migrations

Install PostgreSQL and PostGIS, create an application database and a role allowed to connect and create/use the PostGIS and `pgcrypto` extensions. Put the connection string in `DATABASE_URL`, then run:

```bash
npm run migrate
npm run db:check
```

Migrations are ordered, transactional, and recorded in `schema_migrations`. They create PostGIS/pgcrypto extensions, accounts, PostgreSQL-backed sessions, saved areas, analysis jobs/results, reports, ownership foreign keys, status constraints, and query indexes. There is no destructive automatic down migration.

For example, after PostgreSQL is installed, create the database with `createdb falcon_eye`, set `DATABASE_URL` to the matching local connection URL, then run the migration and database check commands above. The migration creates the application tables and extensions; it does not create the database or database role.

## Earth Engine setup

1. Create or select a Google Cloud project and enable Earth Engine access.
2. Create a service account and authorize it for Earth Engine.
3. Store its JSON key outside the repository with restricted filesystem permissions.
4. Set `EARTH_ENGINE_ENABLED=true`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_APPLICATION_CREDENTIALS` in `.env`.
5. Restart Falcon Eye and inspect `/api/v1/earth-engine/status` or `/api/v1/health`.

Satellite processors use the centralized dataset registry in `src/services/earth-engine/datasets.js`. Automated tests mock the Earth Engine SDK and do not verify live credentials, authorization, image availability, or tile expiry. Confirm those against an authorized project before relying on real analysis results.

## Vegetation comparison workflow

1. Sign in to the authenticated dashboard.
2. Draw a polygon/rectangle or load a saved area. The server checks geometry validity and AOI area before saving or submitting it.
3. Keep the analysis method at **Vegetation Analysis** and dataset at **Sentinel-2**.
4. Enter Period 1 and Period 2 start/end dates. Each range must be ordered, valid, and not in the future.
5. Submit the AOI and dates. The API stores a pending job, then the worker uses `COPERNICUS/S2_SR_HARMONIZED`, SCL masking, median composites, B8/B4 NDVI, and common-valid-pixel change.
6. Review the two period layers and change layer, measured statistics, valid-pixel coverage, image counts, legends, and chart. An analysis is not reported as successful when imagery or valid coverage is insufficient.
7. Open saved results from History, rerun supported analyses into a new job, or download a completed result's PDF report.

The API request fields for `POST /api/v1/analysis` are `analysisType`, `dataset`, `geometry`, `startDate`, `endDate`, `comparisonStartDate`, `comparisonEndDate`, and optional `parameters`/`savedAreaId`. Use `analysisType: "vegetation"` and `dataset: "sentinel-2"`. The two comparison fields are camel-cased exactly as shown. The analysis detail response contains `data.analysis`; its `result_json` includes `dateRange`, `comparisonDateRange`, `statistics.period1`, `statistics.period2`, `statistics.comparison`, `layers`, and `charts`.

## API conventions

Canonical routes are under `/api/v1`; equivalent `/api` aliases remain available for compatibility.

Key endpoints:

```text
GET    /api/v1/health
GET    /api/v1/readiness
GET    /api/v1/earth-engine/status
GET    /api/v1/capabilities
GET    /api/v1/datasets
GET    /api/v1/auth/csrf
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/account
PATCH  /api/v1/account
POST   /api/v1/account/password
GET    /api/v1/areas
POST   /api/v1/areas
GET    /api/v1/areas/:id
PATCH  /api/v1/areas/:id
DELETE /api/v1/areas/:id
GET    /api/v1/analysis
POST   /api/v1/analysis
GET    /api/v1/analysis/:id
POST   /api/v1/analysis/:id/rerun
DELETE /api/v1/analysis/:id
GET    /api/v1/reports/:analysisId
```

Success responses contain `success: true` and `data`. Errors contain `success: false`, a stable `code`, a safe `message`, optional validation `details`, and a request ID. Stack traces and credentials are never returned.

## Health and readiness

`GET /api/v1/health` confirms the application process is responsive and reports each service as `ready`, `connected`, `not_configured`, `unavailable`, or an Earth Engine configuration/authentication state. It returns HTTP 200 even when optional dependencies are absent.

`GET /api/v1/readiness` returns HTTP 503 until PostgreSQL and PostGIS are connected. Earth Engine remains feature-optional and is reported independently.

`GET /api/v1/earth-engine/status` checks configured Earth Engine initialization and returns a safe status without credential material. Both `/api/v1/...` routes and the `/api/...` compatibility aliases are served by the same API router.

## Commands

```bash
npm run dev       # single-server development with watch mode
npm start         # production-style start
npm test          # automated API, geometry, analysis, Earth Engine-mock, and report tests
npm run lint      # JavaScript linting
npm run migrate   # apply pending transactional SQL migrations
npm run db:check  # verify PostGIS connectivity
npm audit         # inspect dependency advisories
```

## Security notes

Falcon Eye uses Helmet/CSP, same-origin enforcement, small request limits, HTTP-only SameSite cookies, production secure cookies, session regeneration after authentication, CSRF tokens, strict authentication rate limits, moderate analysis limits, UUID/input checks, parameterized SQL, ownership checks, and production-safe error responses.

At the October 3, 2026 baseline, `npm audit` reports seven high-severity advisories through the Earth Engine package's legacy Google authentication dependency chain (`node-forge` via `google-p12-pem`/`gtoken`). npm reports no fix. The vulnerable package is not called when Earth Engine is disabled. Track upstream releases and re-run the audit before deployment; do not force an incompatible transitive upgrade without Earth Engine regression testing.

## Scientific limitations

- The MVP dashboard only submits Sentinel-2 vegetation comparisons. Other processors remain in the broader backend registry for compatibility and are not part of the approved workflow.
- NDVI represents spectral vegetation greenness/vigor, not crop yield, disease diagnosis, or universal plant health.
- Period comparison requires at least 1% valid-pixel coverage in both periods and their common valid-pixel area.
- Earth Engine map tile URLs can expire. The dashboard reports unavailable tiles; rerun an analysis for fresh URLs. PDF reports fetch representative center tiles and state when a preview cannot be retrieved.
- Analysis jobs currently run in-process. A server restart can interrupt an active job; this implementation is not a durable distributed queue.
- Automated Earth Engine and PDF tile tests use mocks. They establish code behavior but do not prove live Earth Engine access, PostgreSQL/PostGIS connectivity, imagery availability, or successful browser-to-database report downloads.
- Results depend on cloud/shadow masking, atmospheric conditions, observation coverage, sensor resolution, selected periods, and AOI geometry.
- Field verification is recommended. Falcon Eye is not an emergency authority.

## Production handoff checklist

- Configure and migrate production PostgreSQL/PostGIS.
- Set a strong session secret and validate TLS/reverse-proxy behavior.
- Configure and authorize Google Cloud/Earth Engine credentials.
- Verify live Sentinel-2 vegetation comparisons and report tiles against known AOIs.
- Implement and scientifically validate planned advanced methods before changing their registry status.
- Run lint, tests, dependency audit, and live-service acceptance checks.
- Deploy the single Node server and monitor request IDs, dependency readiness, and failed analysis codes.
