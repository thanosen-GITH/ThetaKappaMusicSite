# ThetaKappaMusicSite

This repository contains the source for thetakappamusic.com — a small, custom static website for Theta Kappa Music.

## Repo name

`ThetaKappaMusicSite`

## Overview

- Static site (HTML/CSS/JS). No build step required.
- Host on Cloudflare Pages by connecting this repo to your Cloudflare account.

## Local preview

Open `index.html` in your browser, or run a local static server:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

## Git / Deployment

1. Create the GitHub repository named `ThetaKappaMusicSite` and add it as a remote:

```bash
git remote add origin https://github.com/<your-username>/ThetaKappaMusicSite.git
git branch -M main
git push -u origin main
```

2. In Cloudflare Pages connect this repository and set the build settings to "No build command" and publish the root directory, if you keep a plain static site.

3. Deploy only from the clean `public/` artifact folder configured in `wrangler.jsonc`. Do not upload the local repository folder directly, because hidden directories such as `.git/` must never be published.

4. The Worker in `src/worker.js` returns `404` for `/.git` and `/.git/*`. After any security-related deployment, purge Cloudflare cache and verify:

```bash
curl -I https://thetakappamusic.com/.git/config
curl -I https://thetakappamusic.com/.git/index
curl -I https://thetakappamusic.com/.git/HEAD
```

These URLs must return `403` or `404`, not `200`.

See `docs/security-incident-git-exposure.md` for the incident checklist.

## Project structure

- `index.html` — landing page
- `assets/` — images, fonts
- `styles/` — CSS or SCSS
- `scripts/` — JavaScript

## Notes

- Keep secrets out of the repo. Use Cloudflare environment variables when needed.
- When you're ready to add templating or content pages, consider Eleventy or Hugo.

---
Created locally on May 15, 2026.
