# Product Requirements Document (PRD)

## Project title

**A Web-Based Vegetation Health Monitoring and Change Detection System Using Sentinel-2 Satellite Imagery and Google Earth Engine**

Project name: **Falcon Eye**

## 1. Project overview

Falcon Eye is a web-based satellite imagery analysis platform focused on vegetation health monitoring and vegetation change detection.

The MVP will use Sentinel-2 satellite imagery and Google Earth Engine to calculate the Normalized Difference Vegetation Index (NDVI), compare vegetation conditions across two selected periods, and present the results through interactive maps, statistics, charts, and downloadable PDF reports.

The application must use actual satellite imagery and real Google Earth Engine processing. Never present fabricated analysis results as genuine results.

## 2. MVP scope

The MVP must focus exclusively on:

- Vegetation health monitoring.
- NDVI calculation.
- Two-period vegetation comparison.
- Vegetation change visualization.
- Statistical summaries and PDF reporting.

Other analysis modes such as flood detection, deforestation, urban growth, crop classification, road/building detection, burned-area analysis, and land-use classification are outside the current MVP. They may be documented as future scope only.

## 3. Existing technology stack

Preserve the repository's existing stack:

- Backend: Node.js and Express.
- Frontend: HTML, CSS, vanilla JavaScript.
- Interactive maps: Leaflet.
- Charts: Chart.js.
- Database: PostgreSQL with PostGIS.
- Satellite processing: Google Earth Engine.
- Satellite dataset: Sentinel-2 Surface Reflectance Harmonized.
- PDF reports: PDFKit.

Do not propose replacing the existing stack.

## 4. Satellite imagery and processing

Use the Google Earth Engine image collection:

`COPERNICUS/S2_SR_HARMONIZED`

Processing requirements:

1. Accept a user-selected Area of Interest (AOI).
2. Accept two date ranges for comparison.
3. Retrieve Sentinel-2 imagery for each period.
4. Apply cloud and cloud-shadow masking using the Scene Classification Layer (SCL).
5. Mask unsuitable pixels, including cloud shadows, clouds, cirrus, snow/ice, and saturated/defective pixels where appropriate.
6. Create median image composites for each date range.
7. Calculate NDVI using:

   `NDVI = (B8 - B4) / (B8 + B4)`

8. Calculate NDVI for both periods.
9. Generate a difference layer using common valid pixels from both periods.
10. Calculate relevant statistics and valid-pixel coverage.

Do not use QA60 as the description of the cloud-masking implementation when SCL is actually used.

## 5. User workflow

The expected workflow is:

1. User signs in.
2. User selects an existing saved area or draws a new AOI on the map.
3. User selects the first date range.
4. User selects the second date range.
5. User starts vegetation analysis.
6. Backend processes the selected periods using Google Earth Engine.
7. The application displays the results on interactive maps.
8. User compares the two periods.
9. User views statistics and charts.
10. User can save the analysis, view analysis history, and generate a PDF report.

## 6. Results and visualization

Display:

- First-period NDVI map.
- Second-period NDVI map.
- NDVI difference/change map.
- Relevant NDVI statistics for both periods.
- Mean, minimum, and maximum NDVI where valid.
- Image counts used in each composite.
- Valid-pixel coverage.
- Area-based summaries where technically supported.
- Charts comparing the two periods.

Use a consistent and understandable NDVI legend.

Two-period comparison results require at least 1% valid-pixel coverage in each period and in their common valid-pixel area.

NDVI interpretation must be presented as indicative information. Do not claim that NDVI alone can diagnose crop disease, prove deforestation, or establish the exact cause of vegetation changes.

## 7. Existing application functionality

Preserve the existing functionality:

- User authentication.
- AOI drawing and selection.
- Saved areas.
- Analysis history.
- Viewing previous analyses.
- Rerunning analyses.
- Deleting history records.
- PDF report generation.

The narrowed MVP must not break these features.

## 8. Backend and API expectations

Adapt to the repository's existing API conventions. The following are suggested API responsibilities, not instructions to create duplicate routes:

- `GET /api/health` — application health.
- `GET /api/earth-engine/status` — Earth Engine configuration and availability.
- `POST /api/vegetation/analyses` — submit a vegetation comparison analysis.
- `GET /api/vegetation/analyses/:id` — retrieve analysis results.
- `GET /api/vegetation/analyses/:id/report` — generate or retrieve a PDF report.

Reuse existing routes and services wherever possible.

## 9. Database expectations

Use the existing PostgreSQL/PostGIS architecture.

Store relevant analysis metadata, AOI geometry, date ranges, processing status, and statistics.

Use JSONB where appropriate for structured statistics.

Do not store unnecessarily large raw satellite rasters in PostgreSQL.

Earth Engine map tile URLs may expire. The application must handle expired URLs honestly, with an appropriate regenerate or rerun workflow.

## 10. Security and configuration

- Keep Earth Engine credentials exclusively on the backend.
- Never expose service-account credentials or private keys in frontend code.
- Never commit `.env` files or credentials.
- Validate user inputs, AOI geometry, and date ranges.
- Reject invalid or future date ranges where appropriate.
- Handle missing Earth Engine configuration gracefully.
- The application must start even when Earth Engine credentials are unavailable.
- Never display fake successful analysis results when processing fails.

## 11. Testing requirements

Tests should cover:

- AOI and date validation.
- NDVI calculation.
- SCL cloud and shadow masking.
- Two-period comparison.
- Common-valid-pixel difference calculation.
- Image counts and valid-pixel coverage.
- API validation and error handling.
- Analysis history compatibility.
- PDF report generation.

Mock data may be used in automated tests, but must never be represented as actual satellite analysis in the production interface.

## 12. Development constraints

Development must be incremental and divided into small approved phases.

- Inspect existing code before changing it.
- Preserve the existing technology stack and folder structure.
- Avoid duplicate files, routes, services, or database migrations.
- Do not modify unrelated functionality.
- Do not introduce dependencies without a clear need and approval.
- Keep existing authentication, saved AOIs, history, and PDF reporting operational.
- Do not claim a feature works unless it has been verified.
- Do not commit or push without explicit approval.

## 13. Acceptance criteria

The MVP will be considered complete when:

1. A user can select or draw an AOI.
2. A user can select two valid date ranges.
3. Sentinel-2 imagery is retrieved through Google Earth Engine.
4. SCL masking and median composites work correctly.
5. NDVI is calculated for both periods.
6. A common-valid-pixel NDVI difference layer is generated.
7. Maps, statistics, and charts display actual processing results.
8. Analysis history works correctly.
9. PDF reports contain the comparison results.
10. Errors and unavailable Earth Engine credentials are handled honestly.
11. Existing authentication and saved-area functionality remain operational.
12. Tests and lint checks pass.

## 14. Future scope

The following may be considered after the MVP is completed:

- Flood monitoring.
- Deforestation monitoring as a separate analysis mode.
- Urban growth analysis.
- Crop-health extensions.
- Burned-area monitoring.
- Water-body change detection.
- Land-use/land-cover classification.
- Road and building detection.
- Additional satellite datasets.

These are not part of the current implementation scope.
