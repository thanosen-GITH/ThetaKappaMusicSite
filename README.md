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

2. Edit the source files at the repository root. `assets/` is the source-of-truth asset directory and may contain editable source artwork such as `.xcf` files. HTML references should always use `assets/...`; do not edit `public/` directly.

3. Generate the clean deployment artifact when you want to inspect it without committing or deploying:

```bash
./scripts/sync-public.sh
git diff -- public/
```

The sync copies browser-ready files from the working tree, including newly created assets, and excludes local metadata and source artwork such as `.xcf` files.

4. Commit, push, and deploy the site with:

```bash
./scripts/publish.sh "Describe the website update"
```

The publish script synchronizes `public/`, stages only website and deployment files, commits them, pushes the current branch, and deploys through Wrangler. Review `git status` before running it; unrelated files are not automatically staged. Deploy only from the clean `public/` folder configured in `wrangler.jsonc`, never from the repository root.

5. The Worker in `src/worker.js` returns `404` for `/.git` and `/.git/*`. After any security-related deployment, purge Cloudflare cache and verify:

```bash
curl -I https://thetakappamusic.com/.git/config
curl -I https://thetakappamusic.com/.git/index
curl -I https://thetakappamusic.com/.git/HEAD
```

These URLs must return `403` or `404`, not `200`.

See `docs/security-incident-git-exposure.md` for the incident checklist.

## Project structure

- `index.html` — landing page
- `assets/` — source-of-truth images and editable artwork
- `public/` — generated, tracked deployment artifact; do not edit directly
- `styles/` — CSS or SCSS
- `scripts/` — JavaScript

## Notes

- Keep secrets out of the repo. Use Cloudflare environment variables when needed.
- When you're ready to add templating or content pages, consider Eleventy or Hugo.

---
Created locally on May 15, 2026.
