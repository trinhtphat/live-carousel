"""Render normalized BGM/SFX stems from approved visual triggers; run in project root."""
import json
import sys
from pathlib import Path

root = Path.cwd()
sys.path.insert(0, str(root / 'audio'))
from audio_pipeline import render_audio

cfg = json.loads((root / 'carousel.json').read_text(encoding='utf-8'))
plan = json.loads((root / 'audio/plan.json').read_text(encoding='utf-8'))
for name in cfg['slides']:
    entry = plan['slides'][name]
    render_audio(root, float(cfg.get('loop', 8)), entry['visual_triggers'],
                 entry.get('audio', {}), root / 'audio/out' / name)
print('Normalized BGM/SFX stems and mixes written to audio/out.')
