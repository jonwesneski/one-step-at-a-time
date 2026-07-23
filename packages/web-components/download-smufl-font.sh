#!/usr/bin/env bash
# Downloads the Bravura SMuFL reference font + metadata into ./smufl
# Source: https://github.com/steinbergmedia/bravura (redist/)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="$SCRIPT_DIR/smufl"
BASE_URL="https://raw.githubusercontent.com/steinbergmedia/bravura/master/redist"

mkdir -p "$DEST_DIR"

curl -fL "$BASE_URL/otf/Bravura.otf" -o "$DEST_DIR/Bravura.otf"
curl -fL "$BASE_URL/bravura_metadata.json" -o "$DEST_DIR/bravura_metadata.json"

echo "Downloaded Bravura font + metadata to $DEST_DIR"
