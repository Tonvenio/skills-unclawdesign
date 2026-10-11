#!/bin/sh
# Packs the skill folder into dist/unclawdesign.skill (a zip with unclawdesign/ at its root),
# the format claude.ai accepts under Settings → Capabilities → Skills.
set -e
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/unclawdesign.skill
zip -qr dist/unclawdesign.skill unclawdesign -x '*/__pycache__/*' '*.pyc' '*/.DS_Store'
echo "dist/unclawdesign.skill ($(du -h dist/unclawdesign.skill | cut -f1))"
