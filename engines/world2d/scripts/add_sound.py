"""Map world2d visual shakes/flashes to subtle SFX and render separate BGM/SFX stems."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('project')
ap.add_argument('--no-mux', action='store_true')
a = ap.parse_args()
root = Path(a.project).expanduser().resolve()
sys.path.insert(0, str(root / 'audio'))
from audio_pipeline import render_audio
subprocess.run(['node', str(root / 'tools/capture.mjs'), 'hits', str(root / 'audio')], cwd=root, check=True)
hits = json.loads((root / 'audio/hits.json').read_text(encoding='utf-8'))
plan_path = root / 'audio/plan.json'
plan = json.loads(plan_path.read_text(encoding='utf-8')) if plan_path.exists() else {'slides': {}}
for i, slide in enumerate(hits['slides']):
    name = f'slide-{i + 1:02d}'
    triggers = {f'shake-{j}': float(t) for j, (t, amp) in enumerate(slide['shakes']) if amp > 0 and 0 <= t < float(hits['loop'])}
    triggers.update({f'flash-{j}': float(t) for j, (t, amp) in enumerate(slide['flashes']) if amp >= 0.4 and 0 <= t < float(hits['loop'])})
    audio = plan['slides'].get(name, {}).get('audio', {'profile': 'subtle', 'events': [{'trigger': key, 'synthetic': 'soft'} for key in list(triggers)[:4]]})
    plan['slides'][name] = {'visual_triggers': triggers, 'audio': audio}
    prefix = root / 'audio/out' / name
    render_audio(root, float(hits['loop']), triggers, audio, prefix)
    video = root / 'renders' / (name + '.mp4')
    if not a.no_mux and video.exists():
        output = root / 'renders/final' / video.name
        output.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-i', str(prefix.with_suffix('.wav')), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'alimiter=limit=0.95:level=false', '-c:a', 'aac', '-b:a', '192k', '-t', str(hits['loop']), '-movflags', '+faststart', str(output)], check=True)
plan_path.write_text(json.dumps(plan, indent=2), encoding='utf-8')
