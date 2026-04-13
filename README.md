# NourishNet — nafsi-NourishNet

> Connecting families, donors, and volunteers to food resources across DC & Maryland.

## Live App

[https://ameyhengle.github.io/nafsi-NourishNet/](https://ameyhengle.github.io/nafsi-NourishNet/)

---

## What it does

NourishNet aggregates food assistance information from dozens of community websites and a Telegram bot into a single, accessible web application. Three user groups are served:

- **Families** — find nearby food distribution events, with map, hours, eligibility, and directions
- **Donors** — discover local food banks and organizations matching their donation preferences
- **Volunteers** — browse opportunities sorted by proximity and urgency

A Telegram bot (`@nourishnet_bot`) allows community organizers to submit events in plain text or via a photo flyer. Submissions are reviewed, geocoded, and merged into the live dataset within 6 hours.

---

## Repository structure

```
nafsi-NourishNet/
├── pipeline/          # Data ingestion pipeline (Node.js)
│   ├── index.js       # Main entry — scrapes all URLs
│   ├── fetcher.js     # axios + Playwright fallback
│   ├── extractor.js   # Groq LLM structured extraction
│   ├── validator.js   # geocoding + staleness check
│   ├── deduplicator.js
│   ├── discoverer.js  # auto-grows URL directory
│   └── bot-poll.js    # Telegram bot polling
├── src/               # React frontend (Vite)
│   ├── pages/         # Landing, Families, Donors, Volunteers, Submit
│   ├── components/    # MapView, EventCard, FilterPanel, etc.
│   ├── hooks/         # useData, useGeolocation
│   ├── utils/         # distance, geocoding
│   └── i18n/          # English and Spanish translations
├── public/
│   ├── data.json              # Pipeline output — read by React app
│   ├── url_directory.json     # Seed + discovered URLs
│   ├── pending_submissions.json
│   └── bot_state.json
└── .github/workflows/
    ├── pipeline.yml    # Runs every 6 hours
    ├── bot-poll.yml    # Runs every 15 minutes
    └── deploy.yml      # Builds + deploys React app on push to main
```

---

## Setup & build instructions

### Prerequisites

- Node.js 20+
- A Groq API key (free at [console.groq.com](https://console.groq.com))
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- A GitHub Personal Access Token with `public_repo` scope

### 1. Clone and install

```bash
git clone https://github.com/AmeyHengle/nafsi-NourishNet
cd nafsi-NourishNet

# Install React app dependencies
npm install

# Install pipeline dependencies
cd pipeline && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example pipeline/.env
# Edit pipeline/.env and fill in:
# GROQ_API_KEY, TELEGRAM_BOT_TOKEN, GH_PAT, GITHUB_REPO
```

### 3. Run the pipeline locally

```bash
cd pipeline
node index.js        # Scrapes all URLs, writes public/data.json
node bot-poll.js     # Polls Telegram for new submissions
```

### 4. Run the React app locally

```bash
# From repo root
npm run dev
# Open http://localhost:5173/nafsi-NourishNet/
```

### 5. Build for production

```bash
npm run build
# Output in dist/ — deployed automatically by deploy.yml on push to main
```

### 6. GitHub Actions secrets required

Set these in your repo → Settings → Secrets and Variables → Actions:

| Secret | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key for LLM extraction |
| `TELEGRAM_BOT_TOKEN` | Token from BotFather |
| `GH_PAT` | GitHub PAT with `public_repo` scope |

### 7. Enable GitHub Pages

Go to repo → Settings → Pages → Source: **GitHub Actions**.

---

## Technologies used

All open source — no proprietary cloud services.

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Map | Leaflet.js + react-leaflet + OpenStreetMap |
| Routing | React Router v6 |
| Data pipeline | Node.js, Playwright, @mozilla/readability |
| LLM extraction | Groq (Llama 3.1 70B) |
| Geocoding | Nominatim (OpenStreetMap) |
| ZIP lookup | Zippopotam.us |
| Bot | Telegram Bot API (polling via GitHub Actions) |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |

---

## Telegram bot

Send a message to `@nourishnet_bot` describing a food event. The bot will extract structured details, ask you to confirm, and add the event to NourishNet within 6 hours.

Accepted input: plain text descriptions, forwarded messages, or photo flyers.

---

## Data pipeline

The pipeline runs every 6 hours via GitHub Actions:

1. Fetches each URL in `public/url_directory.json` (axios → Playwright fallback for SPAs)
2. Strips HTML with Mozilla Readability
3. Sends cleaned text to Groq for structured extraction
4. Validates (confidence threshold, geocoding, staleness)
5. Deduplicates across sources using fuzzy name matching + geographic proximity
6. Discovers new relevant URLs from scraped pages
7. Merges Telegram bot submissions from `public/pending_submissions.json`
8. Commits updated `public/data.json` back to the repo

---

*Built for the NourishNet 2026 DC Data Challenge.*
