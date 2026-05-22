#!/usr/bin/env bash
set -euo pipefail

# Purge Cloudflare zone cache or specific files.
# Requirements:
# - `CF_API_TOKEN`: Cloudflare API token with `Zone:Cache Purge` (Edit) permission
# - `CF_ZONE_ID`: Cloudflare Zone ID for thetakappamusic.com
#
# Usage:
#   CF_API_TOKEN=... CF_ZONE_ID=... ./scripts/purge-cloudflare-cache.sh
#   or set env vars in your shell and run: ./scripts/purge-cloudflare-cache.sh [url1 url2 ...]
#
# If no arguments are provided the script purges everything for the zone.

if [ -z "${CF_API_TOKEN:-}" ] || [ -z "${CF_ZONE_ID:-}" ]; then
  cat <<EOF
Error: CF_API_TOKEN and CF_ZONE_ID must be set in the environment.

Create a Cloudflare API token with the "Zone:Cache Purge" permission and set:
  export CF_API_TOKEN=...
  export CF_ZONE_ID=...

Or run the script inline:
  CF_API_TOKEN=... CF_ZONE_ID=... ./scripts/purge-cloudflare-cache.sh
EOF
  exit 1
fi

if [ "$#" -eq 0 ]; then
  echo "Purging entire zone cache for zone ${CF_ZONE_ID}..."
  resp=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')
else
  # Build JSON array of file URLs
  if command -v jq >/dev/null 2>&1; then
    files_json=$(printf '%s\n' "$@" | jq -R -s -c 'split("\\n")[:-1]')
  else
    # simple JSON build if jq is missing
    files_json="["
    first=true
    for f in "$@"; do
      if [ "$first" = true ]; then
        first=false
      else
        files_json+="," 
      fi
      # escape quotes
      esc=$(printf '%s' "$f" | sed 's/"/\\\\\"/g')
      files_json+="\"${esc}\""
    done
    files_json+="]"
  fi

  echo "Purging ${#@} files from zone ${CF_ZONE_ID}..."
  resp=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"files\":${files_json}}")
fi

if command -v jq >/dev/null 2>&1; then
  echo "$resp" | jq .
else
  echo "$resp"
fi
