# Changelog

## 2026-10-05

### Frontend

- Upgraded the existing Three.js hero globe from a plain material to a locally optimized NASA Blue Marble texture with a geographic grid overlay and static-image fallback.
- Added two secondary orbital paths, restrained moving connection particles, a satellite antenna, and truthful Sentinel-2, Landsat, and Dynamic World labels.
- Added four distinct NASA/USGS-derived remote-sensing visuals to the existing API-driven capability cards with source badges, lazy loading, dark map-grid overlays, and subtle hover zoom.
- Changed the presentation of backend `PLANNED` capabilities from “In development” to the explicit “Planned” label.

### Performance and accessibility

- Kept total new optimized imagery below 600 KiB and retained device-specific scene complexity, pixel-ratio caps, tab-visibility pausing, resource disposal, reduced-motion handling, semantic capability content, and CSS fallback behavior.

### Verification

- Re-ran ESLint and the complete Node/Supertest suite.
- Verified the homepage and public Explorer at desktop, laptop, tablet, and mobile viewport sizes in a Chromium browser.
- Confirmed no frontend console errors, missing local imagery, horizontal overflow, or Leaflet map regressions.

## 2026-10-04

### Frontend

- Reworked the homepage into a dark satellite command-center experience while retaining real capability data from the backend registry.
- Refined the dashboard, authentication, account, public Explorer, map workspace, history, saved-area, and result surfaces with a consistent GIS visual system.
- Added reusable truncation utilities, accessible titles for truncated values and controls, loading skeletons, richer empty states, and actual capability statistics.
- Added a conditional draggable before/after comparison that renders only when real comparison imagery is returned.

### Animation

- Added one isolated Three.js scene containing the Earth, atmosphere, orbital path, stylized satellite, data nodes, connection arcs, and adaptive particles.
- Added GSAP hero entrance and one-time ScrollTrigger reveals.
- Added restrained magnetic CTAs, cursor lighting, capability-card tilt, scan motion, and real-status orbital processing feedback.
- Added Lenis smooth scrolling to the homepage only.

### Responsive

- Added tablet and mobile scene simplification.
- Added a mobile analysis bottom sheet so the Leaflet map remains the primary workspace.
- Added responsive navigation, full-height mobile map treatment, floating coordinate telemetry, and compact card/filter layouts.

### Performance

- Limited WebGL pixel ratio and geometry/particle counts by device class.
- Paused animation while the document is hidden and disposed scene resources on page exit.
- Added WebGL/CSS fallback behavior and comprehensive `prefers-reduced-motion` rules.
- Kept Three.js, GSAP, and Lenis out of map and account pages.

### Testing

- Extended static smoke tests to cover the 3D scene markup, local npm-managed animation assets, and reduced-motion CSS.
- Re-ran ESLint and the complete Node/Supertest suite after the redesign.
- Verified homepage and public Explorer rendering in a Chromium browser at desktop and mobile viewport sizes.
