# NourishNet Bot

**Live app → [https://ameyhengle.github.io/nafsi-NourishNet/](https://ameyhengle.github.io/nafsi-NourishNet/)**

A food assistance platform for the Washington DC and Maryland area. Aggregates food distribution events, donor organisations, and volunteer opportunities from websites and Telegram groups into a single searchable, map-based interface.

---

## Repository structure

```
nafsi-NourishNet/
├── src/                  # React app (Vite + Tailwind + react-leaflet)
├── pipeline/             # Node.js data pipeline (runs via GitHub Actions)
├── public/               # Static assets including data.json (pipeline output)
├── .github/workflows/    # GitHub Actions: deploy, pipeline, bot polling
├── PROMPTS.md            # Kiro prompt pipeline for reproducing the React app
└── docs/                 # Diagrams and report
```

---

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- npm 9+
- A [Groq API key](https://console.groq.com/) (free - used by the data pipeline)
- A [Telegram bot token](https://t.me/BotFather) (for the community submission bot)
- A [GitHub Personal Access Token](https://github.com/settings/tokens) with `public_repo` scope (used by the pipeline to commit back to the repo)

---

## 1. Clone the repository

```bash
git clone https://github.com/AmeyHengle/nafsi-NourishNet
cd nafsi-NourishNet
```

---

## 2. Install dependencies

The project has two separate `package.json` files - one for the React app (root) and one for the Node.js pipeline (`pipeline/`). Install both independently.

```bash
# React app (from repo root)
npm install

# Data pipeline
cd pipeline
npm install
cd ..
```

---

## 3. Environment variables

### React app

The React app has **no required environment variables**. It reads from `public/data.json` at runtime - no API keys needed in the frontend.

### Data pipeline (local only)

Create `pipeline/.env` by copying the example:

```bash
cp .env.example pipeline/.env
```

Open `pipeline/.env` and fill in the following:

```env
# Groq API key - get yours free at https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here

# Telegram bot token - get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# GitHub Personal Access Token with public_repo scope
# Used by the pipeline to commit updated data.json back to the repo
# Create at https://github.com/settings/tokens
GH_PAT=your_github_personal_access_token_here

# Your GitHub repo in the format owner/repo
GITHUB_REPO=AmeyHengle/nafsi-NourishNet
```

> **Never commit `pipeline/.env` to git.** It is already listed in `.gitignore`.

---

## 4. Run the React app locally

```bash
npm run dev
```

Open [http://localhost:5173/nafsi-NourishNet/](http://localhost:5173/nafsi-NourishNet/)

The app loads `public/data.json` on startup. I've included seed data with real DC/MD entries so the map and all three role views are populated immediately - no pipeline run required.

To build for production locally:

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ at localhost:4173/nafsi-NourishNet/
```

---

## 5. Run the data pipeline locally

The pipeline scrapes URLs from `public/url_directory.json`, extracts food event data using the Groq LLM, geocodes addresses via [Nominatim](https://nominatim.openstreetmap.org/), deduplicates records, and writes the results to `public/data.json`.

First install [Playwright's](https://playwright.dev/) Chromium browser (used as a fallback for JavaScript-rendered pages):

```bash
cd pipeline
npx playwright install chromium --with-deps
```

Then run the pipeline:

```bash
cd pipeline
node index.js
```

You'll see per-URL fetch logs, Groq extraction results, and a summary at the end. The updated `public/data.json` is written to the repo root. Reload the dev server to see the new data.

---

## 6. Run the Telegram bot locally

The bot polls the [Telegram Bot API](https://core.telegram.org/bots/api) for new messages and processes them. It handles two flows: direct messages from event organisers (with a YES/NO/EDIT confirmation loop) and silent group monitoring in Telegram groups where the bot has been added.

```bash
cd pipeline
node bot-poll.js
```

Each run fetches updates since the last processed message (tracked in `public/bot_state.json`), processes them, and writes any new confirmed submissions to `public/pending_submissions.json`. Run `node index.js` afterwards to merge those pending submissions into `public/data.json`.

> To test group monitoring: add `@nourishnet_bot` to a Telegram group, go to [@BotFather](https://t.me/BotFather) → `/mybots` → NourishNet Bot → Bot Settings → **Group Privacy → Turn Off**, then post a message in the group and run `node bot-poll.js`.

---

## 7. Deploy to GitHub Pages

### First-time setup

1. Go to your repository → **Settings → Pages → Build and deployment → Source** → select **GitHub Actions** (not "Deploy from a branch").

2. Add the following secrets at **Settings → Secrets and Variables → Actions → New repository secret**:

   | Secret name | Value |
   |---|---|
   | `GROQ_API_KEY` | Your Groq API key |
   | `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
   | `GH_PAT` | Your GitHub Personal Access Token |

### Deploy

Push to `main` - the deploy workflow triggers automatically:

```bash
git add .
git commit -m "your message"
git push origin main
```

The `.github/workflows/deploy.yml` workflow builds the React app with Vite and publishes the `dist/` folder to GitHub Pages. Deployment takes about 60–90 seconds. Your live URL is:

```
https://<your-github-username>.github.io/nafsi-NourishNet/
```

### Trigger the pipeline manually

After deploying, you can trigger the data pipeline from the GitHub Actions tab without pushing code:

```
Repository → Actions → NourishNet Data Pipeline → Run workflow → Run workflow
```

This runs the scraper, updates `public/data.json`, commits it back, and triggers an automatic redeploy with fresh data.

---

## 8. Automated schedules (GitHub Actions)

Once secrets are set and everything is deployed, three workflows run automatically with no further action needed:

| Workflow | Schedule | What it does |
|---|---|---|
| `deploy.yml` | On every push to `main` | Builds React app, publishes to GitHub Pages |
| `pipeline.yml` | Every hour | Scrapes URLs, updates `public/data.json` |
| `bot-poll.yml` | Every 15 minutes | Polls Telegram, processes DMs and group messages |

---

## 9. Seed data and URL directory

`public/data.json` contains 17 seed entries (events, donor orgs, volunteer opportunities) across the DC/MD area so the app is immediately usable without running the pipeline.

`public/url_directory.json` contains the seed website URLs the pipeline scrapes. Add more URLs here in the same format to expand coverage:

```json
{
  "url": "https://example.org/food-pantry",
  "label": "Example Food Pantry",
  "status": "seed",
  "last_visited": null,
  "content_hash": null
}
```

---

## 10. Kiro prompt reproduction

To reproduce the React application using [Kiro](https://kiro.dev/), follow the prompts in [`PROMPTS.md`](./PROMPTS.md) sequentially. Note that the data pipeline and Telegram bot (`pipeline/` folder) were built outside Kiro using Node.js and must be added manually - the PROMPTS.md file explains exactly which files to add and where.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | [React 18](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/) |
| Map | [Leaflet.js](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) + [CartoDB Positron](https://carto.com/basemaps/) tiles |
| Routing | [React Router v6](https://reactrouter.com/) (HashRouter for GitHub Pages) |
| LLM extraction | [Groq API](https://console.groq.com/) - Llama 3.1 70B |
| Geocoding | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap, free, no key) |
| ZIP lookup | [Zippopotam.us](https://api.zippopotam.us/) (free, no key) |
| Bot | [Telegram Bot API](https://core.telegram.org/bots/api) (polling via GitHub Actions) |
| Web scraping | [Playwright](https://playwright.dev/) + [@mozilla/readability](https://github.com/mozilla/readability) |
| Deduplication | [Fuse.js](https://www.fusejs.io/) (fuzzy matching) |
| CI/CD + hosting | [GitHub Actions](https://github.com/features/actions) + [GitHub Pages](https://pages.github.com/) |

All tools are open source. No proprietary cloud services are used.