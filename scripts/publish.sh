#!/usr/bin/env bash
set -euo pipefail

commit_message="${1:-Update website}"
branch="${2:-main}"
repo_root="$(git rev-parse --show-toplevel)"

cd "$repo_root"

artifact_dir="public"
tmp_files="$(mktemp)"
trap 'rm -f "$tmp_files"' EXIT

mkdir -p "$artifact_dir"

git ls-files \
  '*.html' \
  'assets/**' \
  'robots.txt' \
  'scripts/main.js' \
  'sitemap.xml' \
  'styles/**' \
  'tonmeister/**' \
  ':!:public/**' \
  ':!:empty.html' \
  ':!:lighthouse-accessibility.json' \
  > "$tmp_files"

rsync -a --delete --files-from="$tmp_files" ./ "$artifact_dir"/

if find "$artifact_dir" \
  \( -name '.git' -o -path '*/.git/*' \
     -o -name '.wrangler' -o -path '*/.wrangler/*' \
     -o -name '.DS_Store' \
     -o -name 'publish.sh' \) \
  -print -quit | grep -q .; then
  echo "Refusing to publish: forbidden local metadata found in $artifact_dir." >&2
  exit 1
fi

git add --update
git add "$artifact_dir" wrangler.jsonc src/worker.js .assetsignore README.md docs/security-incident-git-exposure.md

if git diff --cached --quiet; then
  echo "No tracked changes to commit."
else
  git commit -m "$commit_message"
  git push origin "$branch"
fi

npx wrangler deploy --config wrangler.jsonc
