# NourishNet Bot — Kiro Prompt Pipeline

This document contains the complete set of prompts used to build the **NourishNet Bot** React web application using Kiro. Judges can pass these prompts into Kiro sequentially to reproduce the tool.

---

## Important Note on Scope

This prompt file covers the **React front-end application only**. Two major components of the NourishNet Bot system were built **outside of Kiro** using manual Node.js development, because they require server-side logic and scheduled execution that falls outside a React application:

1. **Web scraping pipeline** (`pipeline/` folder) — A Node.js pipeline that fetches URLs from a directory, strips HTML using Mozilla Readability, extracts structured food event data using the Groq LLM API (Llama 3.1 70B), geocodes addresses via Nominatim (OpenStreetMap), deduplicates records using fuzzy name matching, and writes the output to `public/data.json`. Runs automatically every hour via GitHub Actions.

2. **Telegram Bot** (`pipeline/bot-poll.js`) — A Node.js polling script that reads messages from the Telegram Bot API every 15 minutes via GitHub Actions. Handles two modes: (a) direct messages from event organisers with a YES/NO/EDIT confirmation flow, and (b) silent group monitoring in DC Food Donation, UMD Pantry, and Maryland Food Volunteers Telegram groups, where the bot detects food events automatically and reacts with a 👍 without disrupting the group.

The React app built by Kiro reads from `public/data.json` (written by the pipeline) and links to the Telegram bot (`@nourishnet_bot`) for community submissions. All data flows one-way: pipeline → `data.json` → React app.

---

## Data Schema Reference

The React app expects `public/data.json` to be an array of entities. Each entity follows this schema:

```json
{
  "entity_type": "event | org | opportunity",
  "name": "string",
  "address": "string",
  "lat": 38.9072,
  "lng": -77.0369,
  "hours": "string",
  "eligibility": "string or null",
  "food_types": ["array", "of", "strings"],
  "languages_served": ["en", "es"],
  "contact": "string or null",
  "description": "string",
  "confidence_score": 0.95,
  "source": "web | community | mock",
  "submitted_via": "telegram_group | telegram_dm | null",
  "telegram_group_name": "string or null",
  "original_message": "string or null",
  "status": "active | ongoing | unverified | expired",
  "source_url": "string or null",
  "current_needs": ["array for orgs"],
  "donation_types": "food | money | both",
  "commitment": "one-time | recurring | flexible",
  "skills_needed": ["array for opportunities"],
  "spots_available": 5,
  "extracted_at": "ISO timestamp"
}
```

---

## Prompt 1: Initial Project Spec

> I am participating in the NourishNet 2026 DC Data Challenge. I need to build a React web application called **NourishNet Bot** that serves as a unified food assistance platform for the Washington DC and Maryland area. The app must connect three distinct user groups to the information they need: (1) families seeking nearby food distribution events, (2) individual and organisational donors who want to give food or money to local organisations, and (3) volunteers who want to give their time. The app reads from a pre-built data file (`public/data.json`) that is updated automatically by a separate pipeline — the React app itself does not scrape or fetch external data. It must be built exclusively using open source tools and libraries, deployable to GitHub Pages. Create a detailed feature spec for this application.

**Choice in Kiro:** Build a Feature → Requirements First

---

## Prompt 2: Technology Stack and Architecture

> Refine the spec with the following technology decisions. Use **Vite** as the build tool and **React 18** as the framework. Use **Tailwind CSS** for styling. Use **React Router v6** with **HashRouter** (required for GitHub Pages since there is no server-side routing). Use **react-leaflet v4** with **Leaflet.js** for the interactive map, with **CartoDB Positron light tiles** (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) — do NOT use the default OpenStreetMap tiles. Use **Zippopotam.us** (`https://api.zippopotam.us/us/{zip}`) for free ZIP-code-to-coordinates geocoding with no API key required. The `base` path in `vite.config.js` must be set to `/nafsi-NourishNet/` to match the GitHub Pages repository path. All data comes from fetching `public/data.json` using `import.meta.env.BASE_URL` to handle both local dev and GitHub Pages paths correctly. Create the full project scaffold.

---

## Prompt 3: Global State — Language and Location Contexts

> The app needs two React contexts that persist across all pages. First, a **LangContext** that stores the current language (`en` or `es`) and a translation object `t`. The translation object must cover all UI strings across every page and component. Create full translations for both English (`src/i18n/en.js`) and Spanish (`src/i18n/es.js`) covering: app name, navigation labels, landing page hero and role descriptions, families/donors/volunteers page labels, filter labels (distance, food type, schedule, language), search placeholder, badge labels for "Community submitted" and "Unverified", and submit page strings. Second, a **LocationContext** that stores the user's location as `{ lat, lng, city, state, zip }` derived from their ZIP code search. Both contexts must be accessible from all pages via `useLang()` and `useUserLocation()` hooks exported from `App.jsx`.

---

## Prompt 4: Data Loading Hook and Distance Utilities

> Create `src/hooks/useData.js` with two exports. First, a `useData()` hook that fetches `public/data.json` on mount using `import.meta.env.BASE_URL`, returning `{ raw, loading, error }` where `raw` is the full array. Second, a `useFilteredData({ raw, userLocation, type, filters })` hook that filters the data by `entity_type` (matching the `type` argument), excludes records with `status === 'expired'`, attaches a `distance` field in miles using the haversine formula if `userLocation` is present, sorts by distance ascending, applies a `maxDistance` filter, filters by `filters.foodType` (partial string match against `food_types` array), filters by `filters.language` (checks `languages_served` array), and filters by `filters.query` (searches name, address, description). Create `src/utils/distance.js` with `distanceMiles(lat1, lng1, lat2, lng2)` and `formatDistance(miles)` returning strings like "0.8 mi" or "< 0.1 mi". Create `src/utils/geocode.js` with `geocodeZip(zip)` that calls the Zippopotam.us API and returns `{ lat, lng, city, state }` or null.

---

## Prompt 5: Shared Components — Navbar, LanguageToggle, SearchBar, CommunityBadge

> Build four shared components.
>
> **Navbar** (`src/components/Navbar.jsx`): Sticky top bar with a 🥦 NourishNet Bot logo (links to `/`), a "How it works" text link (links to `/how-it-works`), a "+ Add Event" text link (links to `/submit`), and a LanguageToggle on the right. Show the back button (`← Back`) on all pages. Use teal-700 for the logo colour.
>
> **LanguageToggle** (`src/components/LanguageToggle.jsx`): A pill-shaped EN | ES toggle. The active language pill has teal-600 background and white text. The inactive pill has white background with gray text. Toggling calls `setLang` from LangContext.
>
> **SearchBar** (`src/components/SearchBar.jsx`): A form with a 5-digit-only text input (placeholder from `t.landing.zip_placeholder`) and a Search button. On submit, calls `geocodeZip`, shows a loading state ("…"), and calls `onLocation(result)` on success or shows an inline error. Accept a `compact` prop — when true, render the input and button side by side without a label.
>
> **CommunityBadge** (`src/components/CommunityBadge.jsx`): Renders a small pill badge. If `source === 'community'`, render a teal badge with "✦ Community submitted". If `status === 'unverified'`, render an amber badge with "⚠ Unverified". Otherwise render nothing.

---

## Prompt 6: MapView Component

> Build `src/components/MapView.jsx` using react-leaflet. Fix the Leaflet default marker icon issue in `src/main.jsx` by deleting `L.Icon.Default.prototype._getIconUrl` and calling `L.Icon.Default.mergeOptions` with the unpkg.com CDN paths.
>
> The map must use **CartoDB Positron tiles** (not OpenStreetMap defaults). Use custom dot icons created with `L.divIcon` — not the default Leaflet markers. Each dot icon has: a circular filled dot, a coloured fill based on `entity_type` (teal `#0d9488` for events, blue `#2563eb` for orgs, green `#16a34a` for opportunities), and a coloured border based on `source` (white for "web", Telegram blue `#2AABEE` for "community", amber `#f59e0b` for "mock"). Selected entities get a larger dot with an outline ring. Clicking a marker calls `onSelect(entity)`.
>
> Each map popup must show: entity name, entity type badge and source badge (labelled "🌐 Web", "✈ Telegram", or "🧪 Demo data"), address, hours, eligibility, food type chips, current needs (for orgs), spots available with colour indicator (for opportunities), contact info, and — if `source === 'community'` and `original_message` exists — a light blue box showing the original Telegram message text with the group name. Include Directions and Details action buttons.
>
> Add a **legend overlay** (positioned absolutely in the bottom-right of the map, z-index 1000) that shows: the three entity type dot colours with labels, and the three border colours with labels ("Web scraped", "Community (Telegram)", "Demo data").
>
> Wrap the MapContainer in a relative-position div so the legend overlay can be positioned correctly.
>
> Include a `Recenter` internal component using `useMap()` that smoothly recentres the map when `userLocation` changes. Show a blue `CircleMarker` at the user's location with a "You are here" popup. Default centre: Washington DC `[38.9072, -77.0369]`, default zoom 11.

---

## Prompt 7: Event, Org, and Opportunity Cards

> Build three card components.
>
> **EventCard** (`src/components/EventCard.jsx`): A clickable card with a ring highlight when selected. Normal state shows: name + distance, CommunityBadge, eligibility badges (green "✓ No ID Required" if eligibility contains "no id", blue "🗣 ES" if Spanish is served), hours in teal, address in gray, food type chips (max 4, then "+N more" label). **When selected/expanded**, additionally show: contact info section (prominent, with 📞 icon), eligibility detail, and — if `source === 'community'` and `original_message` exists — a light blue Telegram message box showing the original message text and group name. Action buttons: "Get Directions" (opens Google Maps) and "Details" (opens source_url). Use `e.stopPropagation()` on button clicks.
>
> **OrgCard** (`src/components/OrgCard.jsx`): Non-expandable card showing: name + distance, CommunityBadge, language badge, description, address, a "Currently needs:" section with blue chip tags from the `current_needs` array, contact info, action buttons "Visit Website" and "Donate Now" both linking to source_url.
>
> **OpportunityCard** (`src/components/OpportunityCard.jsx`): Card showing: name + distance with an urgent badge (red "🔴 Urgent") if `source === 'community'`, CommunityBadge, hours in green, address, description, skills text ("🛠 No experience required" if skills are empty), spots available with red/green dot indicator, contact info, a green "Sign Up" button.

---

## Prompt 8: FilterPanel Component

> Build `src/components/FilterPanel.jsx`. It renders four filter sections, each showing a row of pill buttons. Clicking a pill calls `onChange({ ...filters, [key]: value })`.
>
> **Distance section** (key: `maxDistance`): Pills for 2, 5, 10, 25 miles. Label from `t.filters.distance`. Active pill has teal-600 background.
>
> **Food type section** (key: `foodType`, shown only when `type === 'event'` or `'org'`): Pills for `all`, `produce`, `canned goods`, `hot meals`, `bread`, `baby food`. "all" displays as `t.filters.all`, others are capitalised. Active pill has teal-600 background.
>
> **Schedule section** (key: `schedule`): Pills for `any_day`, `today`, `weekend`, `weekdays`. Labels from `t.filters` object. Active pill has teal-600 background.
>
> **Language section** (key: `language`): Pills for `any`, `en`, `es`. "any" displays as `t.filters.any_lang`, "en" displays as "EN", "es" displays as "ES". Active pill has teal-600 background.
>
> Include a small `t.filters.reset` text button at the bottom that calls `onChange({ maxDistance: 10 })`.

---

## Prompt 9: Landing Page

> Build `src/pages/Landing.jsx` as the home page. Layout is a **two-column full-viewport split** (`min-h-screen flex flex-col md:flex-row`). The page must be scrollable (no `overflow-hidden`) because it has additional sections below the fold.
>
> **Left column** (fixed width 400px on desktop, full width on mobile, white background, right border):
> - 🥦 NourishNet Bot logo at top with subtitle "DC & Maryland food resources"
> - Three large role selection cards stacked vertically with `gap-3`. Each card: 56×56 teal/blue/green icon area (rounded-2xl), large bold role title, subtitle. Roles: `🏠 I need food` → `/families` (teal hover), `💚 I want to donate` → `/donors` (blue hover), `🙋 I want to volunteer` → `/volunteers` (green hover). On hover, border changes colour and icon scales up. Arrow appears on right.
> - A Telegram bot card at the bottom: sky-blue background, Telegram icon SVG (paper plane in circle, colour `#2AABEE`), "Event organizer?" heading, two buttons: "Open @nourishnet_bot" (links to `https://t.me/nourishnet_bot` using `window.open`) and "Learn more →" (navigates to `/submit`).
>
> **Right column** (flex-1, teal-to-blue gradient background):
> - Language toggle pinned top-right (absolute position)
> - Large h1 heading from `t.landing.hero`
> - Subtitle paragraph from `t.landing.sub`
> - White rounded card containing SearchBar (without its own label — the card provides context). On successful search, set `userLocation` in context and navigate to `/families`.
> - Small "New here? See how it works →" link below the card navigating to `/how-it-works`
> - Stats row: show counts of events / orgs / opportunities from `raw` data in teal/blue/green bold numbers
> - Scroll hint ("scroll to learn more ↓") pinned to bottom of right column
>
> **Below the fold — three additional sections:**
>
> **Section 1 "How to use NourishNet Bot"**: Three horizontal step cards with numbered badges: 📍 Enter ZIP code, 🎯 Choose your role, 🗺️ See the map.
>
> **Section 2 "Add your event via Telegram"**: Sky-blue gradient background. Telegram icon + heading. Two side-by-side cards: left card "📱 Message the bot directly" with 4 emoji steps, right card "👥 Bot listens in group chats" with 4 emoji steps and a pills row showing "DC Food Donation", "UMD Pantry", "Maryland Food Volunteers". Left card has an "Open @nourishnet_bot" button using `openExternal()`.
>
> **Section 3 "Where our data comes from"**: Fetches `public/url_directory.json` dynamically. Renders each entry as a ResourceCard with Google favicon (`https://www.google.com/s2/favicons?domain=...&sz=32`), label, hostname, and a status badge ("Core source" for seed, "Auto-discovered" for discovered, "Active" for active). Falls back to four hardcoded DC/MD food bank sources if the fetch fails. Includes a "Add your own source →" link to `/submit`.
>
> Footer: "NourishNet Bot · Built for DC & Maryland communities · Data updated every hour".
>
> **Helper function `openExternal(url)`**: Creates an anchor element, sets href/target/rel, appends to body, clicks it, removes it. Use this for ALL Telegram links to avoid HashRouter interference.

---

## Prompt 10: Families Page

> Build `src/pages/Families.jsx`. This is the core food discovery page. Layout: full-height flex with Navbar at top, then a two-panel layout below: **left panel** (420px wide on desktop, full width on mobile) and **right panel** (flex-1, hidden on mobile).
>
> **Left panel** (gray-50 background, right border, flex column, overflow hidden):
> - Header area (white, bottom border): Row with "Food Events Near You" title (from `t.families.title`) and a filter toggle button. Below: compact SearchBar (calls `setUserLocation`). Below: full-width text search input (placeholder from `t.search.placeholder`). Below (collapsible when filter button clicked): FilterPanel with `type="event"`. Below: result count text showing number of events and user's ZIP/city if known.
> - Scrollable card list: show `t.families.loading` text while loading, `t.families.no_results` with 🔍 emoji when empty, otherwise render EventCards. Clicking a card calls `setSelectedEntity(e)` and scrolls the card into view.
>
> **Right panel**: A rounded-xl div taking full height with padding, containing MapView. Pass `entities={events}`, `userLocation`, `selectedId={selectedEntity?.name}`, `onSelect={setSelectedEntity}`.
>
> Use `useFilteredData` hook for the events array with `type: 'event'`. State: `filters` (initial `{ maxDistance: 10 }`), `query`, `selectedEntity`, `showFilters`.

---

## Prompt 11: Donors Page

> Build `src/pages/Donors.jsx`. Same two-panel layout as Families (left 420px panel + right map).
>
> **Left panel additions**: Below the title, show a donation type quiz — three equal-width pill buttons for "Food items", "Money / funds", "Both" (from `t.donors` translations). Selected type uses blue-600 background. Before the user picks a type, show a placeholder in the card list with 💚 emoji and the quiz prompt. After picking, show OrgCards.
>
> All other behaviour identical to Families: compact SearchBar, text search, collapsible FilterPanel with `type="org"`, result count, OrgCard list (no card selection/expansion — OrgCards are not clickable for expansion), MapView on right.
>
> Use `useFilteredData` hook with `type: 'org'`. State: `donationType` (null initially), `filters`, `query`, `showFilters`.

---

## Prompt 12: Volunteers Page

> Build `src/pages/Volunteers.jsx`. Same two-panel layout.
>
> Left panel: Title "Volunteer Opportunities" (`t.volunteers.title`), compact SearchBar, text search, collapsible FilterPanel with `type="opportunity"`, result count, OpportunityCard list, MapView on right.
>
> Use `useFilteredData` hook with `type: 'opportunity'`. State: `filters`, `query`, `showFilters`. No selection/expansion behaviour — OpportunityCards render standalone.

---

## Prompt 13: How It Works Page

> Build `src/pages/HowItWorks.jsx`. This is a standalone documentation page with Navbar and three sections.
>
> **Section 1 — Overview diagram** (label "The big picture", title "One bot. Three sources. One map."): A visual diagram built entirely in JSX (no external libraries). Shows five source cards in a horizontal row: 🌐 "Food bank websites" (teal border), three ✈ Telegram group cards (blue border) named "DC Food Donation", "UMD Pantry", "MD Food Volunteers", and 📱 "Direct messages" (purple border). A downward arrow. A central hub card with ✈ emoji, "NourishNet Bot" name, description text, and four coloured tag pills: "AI reads messages" (teal), "removes duplicates" (blue), "quality check" (purple), "pins on map" (amber). A downward arrow. Three output cards: 🏠 Families (teal), 💚 Donors (blue), 🙋 Volunteers (green). Each card has emoji, label, and one-line description. Include a banner above explaining the problem.
>
> **Section 2 — Telegram Bot diagram** (label "NourishNet Bot", title "Two ways the bot collects information"): Two side-by-side cards in JSX.
> - Left card "📱 Way 1 — Message the bot directly": Shows a realistic chat thread. User bubble (Telegram blue `#2AABEE` background, white text, border-radius 12px 12px 4px 12px) with a food event message. Bot bubble (gray background, border, border-radius 12px 12px 12px 4px) with extracted details. User YES bubble. Bot green confirmation bubble. Outcome card at bottom with 🗺️.
> - Right card "👥 Way 2 — Bot listens in group chats": Three group pills, a silent badge, chat bubble showing a group post in Telegram blue, bot detection text, a 👍 badge with label "no text reply sent to group", outcome card.
>
> **Section 3 — App Walkthrough** (label "App walkthrough", title "Step-by-step guide"): Four tab pills at the top: 🏠 Finding food, 💚 Donating, 🙋 Volunteering, 📢 Adding your event. Clicking a tab switches the displayed steps. Steps are shown as numbered cards: a coloured circle with the step number (matching the tab colour), and a coloured background card with step title and description. Families: 5 steps (ZIP → map → filter → tap event → directions). Donors: 4 steps. Volunteers: 4 steps. Organisers: 4 steps (find bot → describe event → bot summarises → confirm YES). Use `useState` for the active tab.
>
> At the bottom: a teal CTA section with three buttons linking to `/families`, `/donors`, `/volunteers`.

---

## Prompt 14: Submit Page

> Build `src/pages/Submit.jsx`. This page explains how to submit an event via the Telegram bot and shows community-submitted events.
>
> **Sections:**
> - Title "Add Your Event" and subtitle from `t.submit.sub`
> - White card "How it works" with three numbered steps from `t.submit` translations
> - Two CTA buttons side by side: "✈ @nourishnet_bot" (Telegram blue background, opens `https://t.me/nourishnet_bot` using `openExternal()`), and "← Back" (secondary border style)
> - A QR code placeholder card (gray-50 background): shows the Telegram icon, "Telegram bot" label, and "@nourishnet_bot" in monospace teal, with instruction text below: "Open Telegram and search for @nourishnet_bot"
> - Community events section (only shown when events with `source === 'community'` exist in `raw` data): Title with count badge, subtitle from `t.submit.community_sub`, list of community event cards each showing name, CommunityBadge, address, hours, and `telegram_group_name` (shown as "✈ From {name}" in sky-500 colour)
>
> Use `useData()` to load data. Define `openExternal(url)` as a local function (create anchor, set href/target/rel, append, click, remove).

---

## Prompt 15: Main Entry, App Router, and GitHub Pages Deploy

> Wire everything together.
>
> **`src/main.jsx`**: Import React, ReactDOM, HashRouter, App, `src/index.css`, and `leaflet/dist/leaflet.css`. Fix the Leaflet marker icon bug: import L from leaflet, `delete L.Icon.Default.prototype._getIconUrl`, call `L.Icon.Default.mergeOptions` with iconRetinaUrl, iconUrl, shadowUrl all pointing to `https://unpkg.com/leaflet@1.9.4/dist/images/`. Render `<HashRouter><App /></HashRouter>`.
>
> **`src/App.jsx`**: Create LangContext and LocationContext. Export `useLang()` and `useUserLocation()` hooks. The App component holds `lang` state (default `'en'`), `userLocation` state (default null). Computes `t` by importing en.js and es.js and selecting based on lang. Wrap routes in both context providers. Routes: `/` → Landing, `/families` → Families, `/donors` → Donors, `/volunteers` → Volunteers, `/submit` → Submit, `/how-it-works` → HowItWorks, `*` → Navigate to `/`.
>
> **`src/index.css`**: Add `@tailwind base`, `@tailwind components`, `@tailwind utilities`. Override `.leaflet-container` to `height: 100%; width: 100%; z-index: 0`. Add component layer classes: `.btn-primary` (teal-600 bg, white text, rounded-lg), `.btn-secondary` (teal-600 border, teal-600 text, hover teal-50), `.card` (white bg, rounded-xl, gray-100 border, shadow-sm, hover shadow-md), `.badge` (inline-flex, text-xs, rounded-full, px-2 py-0.5).
>
> **`tailwind.config.js`**: Set `content` to `['./index.html', './src/**/*.{js,jsx}']`.
>
> **`postcss.config.js`**: Export `{ plugins: { tailwindcss: {}, autoprefixer: {} } }`.
>
> **`vite.config.js`**: Use `@vitejs/plugin-react`, set `base: '/nafsi-NourishNet/'`.
>
> **`index.html`**: Set title "NourishNet Bot — Find Food Near You", description meta tag. Use a broccoli emoji favicon via data URI SVG.
>
> **`.github/workflows/deploy.yml`**: GitHub Actions workflow that triggers on push to `main`. Uses `actions/checkout@v4`, `actions/setup-node@v4` (Node 20), runs `npm install` and `npm run build`, then uses `actions/configure-pages@v4`, `actions/upload-pages-artifact@v3` (path: `dist`), and `actions/deploy-pages@v4`. Set permissions `contents: read`, `pages: write`, `id-token: write`.

---

## Prompt 16: Seed Data for Immediate Demo

> Create `public/data.json` with seed data so the app has visible content immediately without needing to run the pipeline. Include 17 entries: 3 food events, 7 donor organisations, and 7 volunteer opportunities, all with real DC/Maryland addresses and geocoordinates. Use a mix of sources: `"source": "web"` for 5 entries, `"source": "community"` for 3 entries (these must have `submitted_via`, `telegram_group_name`, and `original_message` fields so the community badge and Telegram message box appear), and `"source": "mock"` for 9 entries. All entries must have valid `lat`/`lng` coordinates in the DC/Maryland area. Orgs should have `current_needs` arrays. Volunteer opportunities should have `spots_available`, `commitment`, and `skills_needed`. Community entries should have realistic `original_message` text as if forwarded from a Telegram group.
>
> Also create `public/url_directory.json` with at least 4 seed URLs (capitalareafoodbank.org, marylandfoodbank.org, dhs.dc.gov/service/food-assistance, feedingamerica.org), each with fields `url`, `label`, `status: "seed"`, `last_visited: null`, `content_hash: null`.
>
> Create `public/bot_state.json` with `{ "last_update_id": 0 }`, `public/bot_conversations.json` with `{}`, `public/bot_seen_hashes.json` with `{ "hashes": [] }`, and `public/pending_submissions.json` with `[]`.

---

## Prompt 17: Final Polish and Accessibility

> Apply final polish across the whole application.
>
> 1. Ensure all interactive elements are keyboard accessible (focus rings, tab order).
> 2. On the landing page, the scroll hint arrow should animate with `animate-bounce` Tailwind class.
> 3. On mobile (below `md` breakpoint), the right-panel map should be hidden — it is too small to be useful. The left panel should take full width. Add a "Show Map" toggle button in the mobile header that reveals the map in a bottom sheet or full-screen overlay.
> 4. The filter toggle button on Families/Donors/Volunteers should show a coloured active state when any non-default filter is applied (check if `filters.maxDistance !== 10` or any other filter is set).
> 5. When the user's ZIP is known, update the browser tab title to "Food events near {zip} — NourishNet Bot" using `document.title`.
> 6. The Navbar "How it works" link should appear only on screens wider than `sm` breakpoint. On mobile, the Navbar should show only the logo, back button, and language toggle.
> 7. Confirm that `openExternal(url)` is defined and used consistently for ALL Telegram links across Landing.jsx and Submit.jsx so that HashRouter does not interfere with external link navigation.

---

## Reproduction Instructions

Follow these steps exactly to reproduce the NourishNet Bot React application from these prompts:

### Prerequisites

Before opening Kiro, ensure you have:
- Node.js 20 or higher installed
- A GitHub account with a repository named `nafsi-NourishNet`
- GitHub Pages enabled in the repository (Settings → Pages → Source → GitHub Actions)

### Step-by-step

**Step 1 — Open Kiro and set up the project**
1. Open Kiro in your AWS environment
2. Create a new project workspace

**Step 2 — Enter prompts sequentially**
1. Enter **Prompt 1** and select "Build a Feature" → "Requirements First"
2. Wait for Kiro to generate the requirements document
3. Enter **Prompt 2** through **Prompt 17** in order, waiting for each to complete before entering the next
4. Review Kiro's output after each prompt — if a component is missing or incorrect, re-enter the prompt with additional clarification before continuing

**Step 3 — Install dependencies and test locally**
```bash
npm install
npx playwright install chromium   # only needed if running the pipeline locally
npm run dev
```
Open `http://localhost:5173/nafsi-NourishNet/` — the app should display with seed data immediately.

**Step 4 — Add the pipeline and bot files manually**
The following files are NOT generated by Kiro. Copy them from the repository into the correct locations:

```
pipeline/
  index.js          ← main scraping pipeline entry point
  fetcher.js        ← axios + Playwright HTML fetcher
  extractor.js      ← Groq LLM structured extraction
  validator.js      ← geocoding (Nominatim), staleness, confidence filtering
  deduplicator.js   ← fuzzy name match + haversine proximity merge
  discoverer.js     ← outbound link scoring, URL directory growth
  bot-poll.js       ← Telegram bot polling (DM + group monitoring)
  package.json      ← pipeline-specific dependencies

.github/workflows/
  pipeline.yml      ← runs pipeline every hour
  bot-poll.yml      ← polls Telegram every 15 minutes
```

**Step 5 — Set GitHub Actions secrets**

Go to your repository → Settings → Secrets and Variables → Actions, and add:

| Secret name | Description |
|---|---|
| `GROQ_API_KEY` | API key from console.groq.com (free) |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather on Telegram |
| `GH_PAT` | GitHub Personal Access Token with `public_repo` scope |

**Step 6 — Deploy to GitHub Pages**
```bash
git add .
git commit -m "feat: initial NourishNet Bot deployment"
git push origin main
```
The `deploy.yml` workflow triggers automatically. Go to Actions tab to monitor progress. The live URL will be:
```
https://ameyhengle.github.io/nafsi-NourishNet/
```

**Step 7 — Register the Telegram bot with BotFather**
1. Open Telegram → search @BotFather → `/newbot`
2. Name: `NourishNet Bot`, username: `nourishnet_bot`
3. Save the token to the `TELEGRAM_BOT_TOKEN` GitHub secret
4. Go to BotFather → `/mybots` → NourishNet Bot → Bot Settings → Group Privacy → **Turn Off**
   (This allows the bot to see all messages in groups, not just commands)

**Step 8 — Trigger the pipeline manually**

Go to GitHub → Actions → "NourishNet Data Pipeline" → "Run workflow". This runs the scraper, populates `public/data.json`, and commits it back to the repo, triggering a GitHub Pages redeploy with live data.

---

## Notes on Manual Code Improvements

Several improvements were made to Kiro's generated code after generation:

- **`src/App.jsx`**: Kiro initially scoped `userLocation` state locally to each page. This was restructured into a shared `LocationContext` so that the ZIP entered on Landing persists when navigating to Families/Donors/Volunteers.
- **`src/components/MapView.jsx`**: The CartoDB Positron tile layer required manual configuration — Kiro defaulted to OpenStreetMap. The two-dimensional pin encoding (fill = entity type, border = data source) and the legend overlay were added manually.
- **`src/pages/Landing.jsx`**: The Telegram link buttons were changed from `<a href target="_blank">` to a `openExternal()` function that creates and clicks a DOM anchor element — this prevents HashRouter from intercepting the click on GitHub Pages.
- **`pipeline/bot-poll.js`**: The main polling loop had a structural bug where the group message handler was nested inside the private chat block due to a missing closing brace. This was fixed so that group and private messages are handled as mutually exclusive `if / else if` branches, with the group check evaluated first.

---

*NourishNet Bot — 2026 DC Data Challenge submission by the nafsi team.*
*Repository: https://github.com/AmeyHengle/nafsi-NourishNet*
*Live app: https://ameyhengle.github.io/nafsi-NourishNet/*
