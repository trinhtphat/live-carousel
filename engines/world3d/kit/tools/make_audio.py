"""Render normalized BGM/SFX stems from approved visual triggers; run in project root."""
import json
import sys
from pathlib import Path
from typing import List, Optional

def main(argv: Optional[List[str]] = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    root = Path.cwd()
    sys.path.insert(0, str(root / 'audio'))
    from audio_pipeline import render_audio

    cfg = json.loads((root / 'carousel.json').read_text(encoding='utf-8'))
    plan = json.loads((root / 'audio/plan.json').read_text(encoding='utf-8'))
    if len(args) > 1 or (args and args[0] not in cfg['slides']):
        raise ValueError('Pass one valid slide name, or no name to render all audio')
    selected = args or cfg['slides']
    for name in selected:
        entry = plan['slides'][name]
        render_audio(root, float(cfg.get('loop', 8)), entry['visual_triggers'],
                     entry.get('audio', {}), root / 'audio/out' / name)
    print('Normalized BGM/SFX stems and mixes written to audio/out.')
    return 0


if __name__ == '__main__':
    main()
