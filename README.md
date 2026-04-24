# Rethink Sabha Rebuild (GitHub Pages Ready)

This rebuild is a static multi-page website designed to deploy directly from GitHub to GitHub Pages.

## What is included

- SEO-ready pages: `index.html`, `debates.html`, `learn.html`, `about.html`
- Better crawlability: `robots.txt`, `sitemap.xml`, canonical tags, metadata
- Debate directory powered by `data/debates.json`
- Registration modal with local save + optional API forwarding
- AI coach UI with optional API endpoint integration
- Secure AI backend template: `backend/cloudflare-worker`
- GitHub Pages CI/CD workflow: `.github/workflows/pages.yml`

## Publish from your GitHub

1. Create a new GitHub repository.
2. Push this folder to the `main` branch.
3. In GitHub repo settings, open `Pages` and make sure source is `GitHub Actions`.
4. The workflow deploys automatically after push.

## Required updates before production

1. Replace all `https://yourdomain.com` URLs in:
   - `index.html`
   - `debates.html`
   - `learn.html`
   - `about.html`
   - `robots.txt`
   - `sitemap.xml`
2. Update contact email in `about.html`.
3. Update `data/debates.json` with your real sessions.
4. Configure API endpoints in `assets/js/config.js`:
   - `aiEndpoint`: server endpoint for AI coach response
   - `registrationEndpoint`: optional endpoint for storing registrations

## Make AI coach actually live (recommended)

Use the Cloudflare Worker backend included in:

- `backend/cloudflare-worker`
- guide: `backend/cloudflare-worker/README.md`

Quick path:

1. Deploy worker with your Gemini key as `GEMINI_API_KEY`.
2. Copy worker URL and set `aiEndpoint` in `assets/js/config.js` to:
   - `https://<your-worker>.workers.dev/coach`
3. Push to GitHub again.

## Important security note

Do not place secret API keys in frontend files.  
Keep AI keys on your server/API endpoint and call that endpoint from this site.
