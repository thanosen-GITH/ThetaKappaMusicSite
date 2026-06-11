# Git Metadata Exposure Response

On June 11, 2026, these URLs returned `HTTP/2 200` from Cloudflare:

```bash
curl -I https://thetakappamusic.com/.git/config
curl -I https://thetakappamusic.com/.git/index
curl -I https://thetakappamusic.com/.git/HEAD
```

Treat this as an active Git metadata exposure until a clean deployment and cache purge have been verified.

## Immediate Remediation

1. In Cloudflare Pages, confirm the project is connected to `thanosen-GITH/ThetaKappaMusicSite`, branch `main`.
2. Confirm the deploy command is `npx wrangler deploy`.
3. Confirm `wrangler.jsonc` deploys static assets from `public/`, not the repository root.
4. Trigger a fresh deployment from the latest `main` commit.
5. Do not use manual uploads that include hidden files or local project metadata.
6. Purge Cloudflare cache for the zone. Prefer "Purge Everything"; at minimum purge:
   - `https://thetakappamusic.com/.git/config`
   - `https://thetakappamusic.com/.git/index`
   - `https://thetakappamusic.com/.git/HEAD`

The repository includes a Worker guard in `src/worker.js` that returns `404` for `/.git` and `/.git/*` after the clean deployment is active. Static assets are deployed from the clean `public/` artifact folder, so `.git/`, `.wrangler/`, and other local metadata are not part of the asset source.

## Verification

After redeploying and purging cache, verify Git metadata is not reachable:

```bash
curl -I https://thetakappamusic.com/.git/config
curl -I https://thetakappamusic.com/.git/index
curl -I https://thetakappamusic.com/.git/HEAD
```

Each URL must return `403` or `404`, not `200`.

Also confirm the public site still works:

```bash
curl -I https://thetakappamusic.com/
curl -I https://thetakappamusic.com/apps/brg.html
```

These should return `200`.

## Secret Review

Run a dedicated full-history secret scanner before closing the incident:

```bash
gitleaks detect --source . --no-banner --redact
```

or:

```bash
trufflehog git file://. --only-verified
```

Rotate any credential found by the scanner. Also rotate any Cloudflare API token, GitHub token, or deploy key that may have been reachable through exposed Git metadata, even if the scanner does not show the literal value.

## Repository Visibility

Make the GitHub repository private if the source, history, deleted files, or operational scripts are not intended to be public. Keeping it public is acceptable only after the full-history scan is clean and all repository content is intentionally public.
