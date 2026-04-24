# Rethink Sabha AI Backend (Cloudflare Worker)

This worker provides a secure `/coach` endpoint for the GitHub Pages frontend.

## Why this exists

GitHub Pages is static hosting.  
AI keys must not be stored in browser code, so requests go through this worker.

## 1) Install and login

```bash
cd backend/cloudflare-worker
npm install
npx wrangler login
```

## 2) Set your Gemini API key as a secret

```bash
npx wrangler secret put GEMINI_API_KEY
```

Paste your key when prompted.

## 3) (Optional) Update allowed origin and model

Edit `wrangler.toml`:

- `ALLOWED_ORIGIN` should be your site origin (`https://mrsuitable.github.io` for now)
- `GEMINI_MODEL` can be changed if needed

## 4) Deploy

```bash
npx wrangler deploy
```

You will get a worker URL like:

`https://rethink-sabha-ai.<subdomain>.workers.dev`

## 5) Connect frontend to backend

Update `assets/js/config.js`:

```js
window.RETHINK_CONFIG = {
  aiEndpoint: "https://rethink-sabha-ai.<subdomain>.workers.dev/coach",
  registrationEndpoint: ""
};
```

Commit and push to GitHub. After Pages redeploys, AI coach will call the live endpoint.
