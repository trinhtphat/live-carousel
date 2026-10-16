"""Render manifest-gated BGM/SFX stems and mixes from carousel.json.

Run from the project: python audio/make_audio.py.
Audio events reference visual_triggers IDs; never use free-floating timestamps.
"""
import json
from pathlib import Path
from project_audio import render_project

if __name__ == "__main__":
    render_project(Path(__file__).resolve().parent.parent)
