#!/usr/bin/env bash
set -euo pipefail

commit_message="${1:-Update website}"
repo_root="$(git rev-parse --show-toplevel)"

cd "$repo_root"

branch="${2:-$(git branch --show-current)}"
if [[ -z "$branch" ]]; then
  echo "Refusing to publish from a detached HEAD." >&2
  exit 1
fi

scripts/sync-public.sh

# Stage only the source, generated artifact, and deployment configuration.
# Unrelated notes and local files remain untouched.
git add -- \
  '*.html' \
  assets \
  apps \
  robots.txt \
  scripts/main.js \
  scripts/publish.sh \
  scripts/sync-public.sh \
  sitemap.xml \
  styles \
  tonmeister \
  public \
  wrangler.jsonc \
  src/worker.js \
  .assetsignore \
  README.md \
  docs/security-incident-git-exposure.md

if git diff --cached --quiet; then
  echo "No website changes to commit."
else
  git commit -m "$commit_message"
  git push origin "$branch"
fi

npx wrangler deploy --config wrangler.jsonc
