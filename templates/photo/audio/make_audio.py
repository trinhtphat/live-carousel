"""Render manifest-gated BGM/SFX stems and mixes from carousel.json.

Run from the project: python audio/make_audio.py.
Audio events reference visual_triggers IDs; never use free-floating timestamps.
"""
import json
import sys
from pathlib import Path
from project_audio import render_project

if __name__ == "__main__":
    if len(sys.argv) > 2:
        raise SystemExit("Pass one slide name or no name for all slides")
    render_project(Path(__file__).resolve().parent.parent, only=sys.argv[1] if len(sys.argv) == 2 else None)
