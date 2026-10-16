"""Portable world3d scaffold; dependencies are installed only when requested."""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

engine = Path(__file__).resolve().parents[1]
skill = engine.parents[1]
ap = argparse.ArgumentParser()
ap.add_argument('example', choices=['encore', 'offshore', 'dental'])
ap.add_argument('project')
ap.add_argument('--install', action='store_true', help='Install world3d npm dependencies')
a = ap.parse_args()
out = Path(a.project).expanduser().resolve()
if out.exists():
    ap.error('Project already exists; choose a new directory.')
shutil.copytree(engine / 'examples' / a.example, out)
shutil.copytree(engine / 'kit/tools', out / 'tools')
for name in ['package.json', 'package-lock.json']:
    shutil.copy2(engine / 'kit' / name, out / name)
for name in ['assets/raw', 'assets/cut', 'assets/3d', 'assets/sfx', 'audio/out', 'qa', 'renders']:
    (out / name).mkdir(parents=True, exist_ok=True)
shutil.copy2(skill / 'scripts/audio_pipeline.py', out / 'audio/audio_pipeline.py')
shutil.copytree(skill / 'assets/sfx', out / 'assets/sfx', dirs_exist_ok=True)
shutil.copy2(skill / 'sfx_manifest.json', out / 'sfx_manifest.json')
cfg = json.loads((out / 'carousel.json').read_text())
plan = {'slides': {name: {'visual_triggers': {}, 'audio': {'profile': 'subtle', 'events': []}} for name in cfg['slides']}}
(out / 'audio/plan.json').write_text(json.dumps(plan, indent=2))
if a.install:
    subprocess.run(['npm.cmd' if __import__('os').name == 'nt' else 'npm', 'ci', '--no-audit', '--no-fund'], cwd=out, check=True)
print(f'Project: {out}\nRewrite BRIEF and visuals. Map real visual events in audio/plan.json, then run python tools/make_audio.py.')
