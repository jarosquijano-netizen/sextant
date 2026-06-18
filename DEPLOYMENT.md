# Sextant — Deployment Guide

## Repo layout

```
sextant/
├── backend/    → Railway (Node/Express + Postgres)
├── extension/  → Chrome (load unpacked from extension/)
└── dashboard/  → Netlify (React SPA)
```

---

## 1. Railway — Backend

### First-time setup

1. Go to https://railway.app → New Project → **Deploy from GitHub repo** → pick `jarosquijano-netizen/sextant`
2. Railway will detect the repo root. You need to **set the root directory** to `backend`:
   - Project settings → Source → Root Directory: `backend`
3. Add a **Postgres** plugin: click + → Database → PostgreSQL. Railway auto-sets `DATABASE_URL`.
4. Set these environment variables (Railway → Variables tab):

   | Variable | Value |
   |----------|-------|
   | `SEXTANT_API_KEY` | any strong random string, e.g. `openssl rand -hex 32` |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` from console.anthropic.com |
   | `ALLOWED_ORIGINS` | *(leave empty for now; add Netlify URL after deploying dashboard)* |
   | `NODE_ENV` | `production` |

5. Deploy. Railway runs `node server.js` (from `railway.json`). The server auto-runs DB migrations on startup.
6. Copy the Railway-assigned URL (e.g. `https://sextant-production.up.railway.app`) — you'll need it for the extension and dashboard.

### Subsequent deploys

Just push to `claude/upbeat-cannon-az9q5z` (or merge to main). Railway redeploys automatically on push.

### Test the backend is live

```bash
curl -H "Authorization: Bearer YOUR_SEXTANT_API_KEY" \
  https://YOUR_RAILWAY_URL/health
# → {"status":"ok","ts":"..."}

curl -H "Authorization: Bearer YOUR_SEXTANT_API_KEY" \
  https://YOUR_RAILWAY_URL/profile
# → default profile JSON
```

---

## 2. Chrome Extension

### Load unpacked (development / personal use)

1. In this repo: `cd extension && npm install && npm run build`
2. Open Chrome → `chrome://extensions` → Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `extension/` folder (not `extension/dist/`)
4. The extension appears. Open it, go to **Settings** tab, enter:
   - **Backend URL**: `https://YOUR_RAILWAY_URL`
   - **API Key**: your `SEXTANT_API_KEY`
5. Go to **Profile** tab → verify it loads your profile from Railway.

### Rebuilding after code changes

```bash
cd extension
npm run build   # outputs to extension/dist/
```

Then in `chrome://extensions` click the **↺ refresh** button on the Sextant card.

### Publishing to Chrome Web Store (optional)

1. `cd extension && npm run build`
2. Zip the `extension/` directory (include `dist/`, `public/`, `manifest.json`; exclude `node_modules/`)
3. Upload to https://chrome.google.com/webstore/devconsole

---

## 3. Netlify — Dashboard

### First-time setup

1. Go to https://netlify.com → Add new site → **Import from Git** → pick `jarosquijano-netizen/sextant`
2. Netlify reads `dashboard/netlify.toml` automatically:
   - Build command: `npm install && npm run build`
   - Publish directory: `dashboard/dist`
   - Base directory: `dashboard`
3. Set these environment variables (Netlify → Site configuration → Environment variables):

   | Variable | Value |
   |----------|-------|
   | `VITE_API_BASE_URL` | `https://YOUR_RAILWAY_URL` |
   | `VITE_API_KEY` | your `SEXTANT_API_KEY` |

4. Trigger a deploy. Your dashboard URL will be something like `https://sextant-dashboard.netlify.app`.

5. **Add the Netlify URL to Railway CORS:**
   In Railway → Variables → set `ALLOWED_ORIGINS` to `https://sextant-dashboard.netlify.app` (no trailing slash). Railway redeploys automatically.

### Subsequent deploys

Push to git → Netlify rebuilds automatically.

---

## Environment variable summary

### Railway (backend)
| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | ✅ auto | Set by Railway Postgres plugin |
| `SEXTANT_API_KEY` | ✅ | Your secret key — same value goes in extension Settings and Netlify |
| `ANTHROPIC_API_KEY` | ✅ | From console.anthropic.com — never put this in the extension |
| `ALLOWED_ORIGINS` | optional | Comma-separated allowed CORS origins (Netlify URL) |
| `PORT` | ✅ auto | Set by Railway |

### Netlify (dashboard)
| Var | Required | Notes |
|-----|----------|-------|
| `VITE_API_BASE_URL` | ✅ | Your Railway URL |
| `VITE_API_KEY` | ✅ | Same as `SEXTANT_API_KEY` on Railway |

### Extension (Settings tab in popup)
| Field | Value |
|-------|-------|
| Backend URL | Your Railway URL |
| API Key | Your `SEXTANT_API_KEY` |

---

## Local backend development

```bash
cd backend
cp .env.example .env   # fill in values
npm install
# Start a local Postgres, or point DATABASE_URL at your Railway DB
npm run dev            # node --watch server.js
```

## Local dashboard development

```bash
cd dashboard
cp .env.example .env.local   # fill in VITE_* vars
npm install
npm run dev
```

Create `dashboard/.env.example`:
```
VITE_API_BASE_URL=https://YOUR_RAILWAY_URL
VITE_API_KEY=your-secret-key
```
