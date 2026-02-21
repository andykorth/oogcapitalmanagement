# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OOG Capital Management is a Hugo static site for a community organization managing resources in the game **Prosperous Universe (PrUn)**. It combines a Hugo blog with interactive JavaScript tools that interface with live game APIs.

## Commands

```bash
# Normal development — run from the project root
hugo server -D         # Dev server with drafts (Hugo v0.155+)

# Tailwind CSS rebuild — only needed when editing Tailwind classes in layouts/
# Run from themes/tailbliss/ in a separate terminal alongside hugo server -D
npm start              # Watch and recompile Tailwind CSS (tailbliss/assets/css/style.css)
npm run watch:tw       # Same as npm start

# Production build (from themes/tailbliss/)
npm run build          # hugo --minify
```

> **Note:** `npm start` no longer launches Hugo. It only runs the Tailwind watcher.
> Run `hugo server -D` from the project root separately.
> The Tailwind config scans both `themes/tailbliss/layouts/` and the root `layouts/`
> directory, so classes added to root-level shortcodes and overrides are included.

```bash
# Deployment (from root)
./deploy.sh            # Rsync /public/ to remote server
./upload.sh            # SFTP upload from /public/
```

There are no automated tests.

## Architecture

### Two-Layer Structure

1. **Hugo Layer** — Content and layout in `content/` and `layouts/`. Hugo compiles markdown + templates into HTML.

2. **JavaScript Tools Layer** — Interactive tools in `static/*.js` that run entirely in the browser. These fetch live game data from external APIs and are embedded into Hugo pages via shortcodes (e.g., `{{< corp-manager >}}`).

### Data Flow for Tools

```
User Browser
  → static/*.js tool app
    → pricing-and-materials.js (shared data module)
      → https://api.prunplanner.org/data/exchanges  (market prices, 1hr cache)
      → https://rest.fnar.net/  (game entity data, 24hr cache)
      → localStorage (cache layer)
    → Renders results in the DOM
```

### Key JavaScript Files in `static/`

| File | Purpose |
|------|---------|
| `pricing-and-materials.js` | **Shared module**: fetches market pricing and material data; manages localStorage caching with TTL (1hr for prices, 24hr for corp data); exports functions used by other tools |
| `infra-data.js` | **Shared data**: static constants for infrastructure buildings (`UPKEEP_BUILDINGS`), population tier happiness weights (`WEIGHTS`), and need types; imported by both `governor-helper.html` and `governing-mats.js` |
| `corp-manager.js` | Corporation member tracking; embeds report iframes from `pmmg-products.github.io` |
| `infra-calc.js` | Building infrastructure calculator (cost estimates per planet) |
| `governing-mats.js` | Government utility building material efficiency rankings; imports from `infra-data.js` |
| `intel-lookup.js` | Company intelligence lookup — header card, offices with expiry times, exchange orders cross-tab |
| `storage-tool.js` | Storage/inventory management |
| `material-finder.js` | Material search utility |
| `flights.html` | Standalone ship flight tracker (not a Hugo page; has hardcoded auth token) |

Some tools are self-contained with inline `<script type="module">` in their shortcode rather than a separate `.js` file: `governor-helper.html` and `gateway-tool.html`.

### External APIs

- `https://rest.fnar.net/` — Primary game data via the older FIO api (corporations, ships, companies, flights, infrastructure, planets)
- `https://api.fnar.net/` — Additional game data via the newer FIO api, such as gateways.
- `https://api.prunplanner.org/data/exchanges` — Market pricing data
- `https://pmmg-products.github.io/reports/` — Embedded analytics reports (iframes)

### Hugo Theme and Override Structure

Hugo resolves layouts and assets by checking root-level directories **before** the theme. This means:

- **`layouts/`** (root) — OOG-specific overrides and all tool shortcodes. These take precedence over `themes/tailbliss/layouts/`.
- **`assets/css/custom.css`** (root) — OOG-specific CSS overrides (dark/light theme variables, table styles, calculator patterns, ship card styles). Takes precedence over the theme's copy.
- **`themes/tailbliss/`** — Upstream theme. Contains base layouts (`baseof.html`, `single.html`, `list.html`), partials (`nav.html`, `footer.html`, `head/css.html`), generic shortcodes, and Tailwind/PostCSS config.

Do not add OOG-specific files inside `themes/tailbliss/`, put them in root `layouts/` or `assets/` instead.

### Shortcodes

All tool shortcodes live in `layouts/shortcodes/`. They follow a consistent pattern:
- Static HTML skeleton with named container `div`s
- Colored section bands: indigo left-border (`border-left: 3px solid rgb(99 102 241)`) for live data, emerald for calculated results
- `<script type="module">` either inline or referencing `static/*.js`
- `localStorage` caching with TTL (typically 30 min – 24 hr depending on data volatility)
- URL parameter support for shareable links where applicable

### Content Sections

Tool pages live under `content/<tool-name>/index.md` and contain only front matter plus a shortcode invocation. Blog posts are in `content/posts/`.

### Large Static Assets

- `static/map/` (~36 MB) — Interactive universe map SVG and JSON planet/system data
- `static/shareholders/` (~121 MB) — Discord chat exports (organizational archive)

These are large and should not be opened wholesale.
