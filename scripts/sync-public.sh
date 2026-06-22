#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

artifact_dir="public"
mkdir -p "$artifact_dir"

# Build from the working tree so new files do not need a preliminary commit.
# Native artwork stays in assets/; only browser-ready files enter public/.
rsync -a --delete --delete-excluded \
  --exclude='.DS_Store' \
  --exclude='*.xcf' \
  --include='/*.html' \
  --include='/robots.txt' \
  --include='/sitemap.xml' \
  --include='/apps/***' \
  --include='/assets/***' \
  --include='/scripts/' \
  --include='/scripts/main.js' \
  --include='/styles/***' \
  --include='/tonmeister/***' \
  --exclude='*' \
  ./ "$artifact_dir"/

if find "$artifact_dir" \
  \( -name '.git' -o -path '*/.git/*' \
     -o -name '.wrangler' -o -path '*/.wrangler/*' \
     -o -name '.DS_Store' \
     -o -name '*.xcf' \
     -o -name 'publish.sh' -o -name 'sync-public.sh' \) \
  -print -quit | grep -q .; then
  echo "Refusing to publish: forbidden source or metadata found in $artifact_dir." >&2
  exit 1
fi

echo "Synchronized site sources to $artifact_dir/."
