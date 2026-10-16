#!/bin/bash
# Portable scaffold. No implicit package installation.
set -e
ENGINE="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ENGINE/scripts/new_carousel.py" "$@"
