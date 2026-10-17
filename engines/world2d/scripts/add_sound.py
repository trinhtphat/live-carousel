"""Map World 2D visual events to registered SFX and render separate audio stems."""
import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import List, Optional


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('project')
    ap.add_argument('--no-mux', action='store_true')
    ap.add_argument('--only', help='one slide name, for example slide-01')
    ap.add_argument('--video-dir', default='renders')
    ap.add_argument('--output-dir', default='renders/final')
    a = ap.parse_args(argv)
    root = Path(a.project).expanduser().resolve()

    def project_dir(value):
        path = (root / value).resolve()
        if not path.is_relative_to(root):
            ap.error('video/output directory must stay inside the project')
        return path

    video_dir = project_dir(a.video_dir)
    output_dir = project_dir(a.output_dir)
    sys.path.insert(0, str(root / 'audio'))
    from audio_pipeline import render_audio

    subprocess.run(['node', str(root / 'tools/capture.mjs'), 'hits', str(root / 'audio')], cwd=root, check=True)
    hits = json.loads((root / 'audio/hits.json').read_text(encoding='utf-8'))
    plan_path = root / 'audio/plan.json'
    plan = json.loads(plan_path.read_text(encoding='utf-8')) if plan_path.exists() else {'slides': {}}
    names = [f'slide-{i + 1:02d}' for i in range(len(hits['slides']))]
    if a.only and a.only not in names:
        ap.error(f'unknown slide: {a.only}')
    for i, slide in enumerate(hits['slides']):
        name = names[i]
        if a.only and name != a.only:
            continue
        triggers = {f'shake-{j}': float(t) for j, (t, amp) in enumerate(slide['shakes']) if amp > 0 and 0 <= t < float(hits['loop'])}
        triggers.update({f'flash-{j}': float(t) for j, (t, amp) in enumerate(slide['flashes']) if amp >= 0.4 and 0 <= t < float(hits['loop'])})
        audio = plan['slides'].get(name, {}).get('audio')
        if not audio:
            raise ValueError(f'Approved audio plan with a licensed library SFX is required for {name}')
        plan['slides'][name] = {'visual_triggers': triggers, 'audio': audio}
        prefix = root / 'audio/out' / name
        render_audio(root, float(hits['loop']), triggers, audio, prefix)
        video = video_dir / (name + '.mp4')
        if not a.no_mux:
            if a.only and not video.exists():
                raise FileNotFoundError(f'Cover video is missing: {video}')
            if video.exists():
                output_dir.mkdir(parents=True, exist_ok=True)
                output = output_dir / video.name
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-i', str(prefix.with_suffix('.wav')), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'alimiter=limit=0.95:level=false', '-c:a', 'aac', '-b:a', '192k', '-t', str(hits['loop']), '-movflags', '+faststart', str(output)], check=True)
    plan_path.write_text(json.dumps(plan, indent=2), encoding='utf-8')
    return 0


if __name__ == '__main__':
    main()
