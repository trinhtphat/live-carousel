"""Bridge project visual cues into the shared two-track mixer."""
import json
from pathlib import Path
from audio_pipeline import render_audio

# These references match the shipped motion demo. Rewritten slides must supply
# visual_triggers in carousel.json instead, using their actual animation times.
MOTION_DEMO = {
    '01-hook': (6, {'ball-contact': .5, 'headline-flip': 2, 'drop': 2.5}),
    '02-easing': (8, {'ball-land': .34, 'easing-finish': 2}),
    '03-weight': (8, {'first-bounce': 1, 'launch': 6.45}),
    '04-cta': (8, {'ball-land': .5, 'snap': 1, 'post-click': 3}),
}

def render_project(root):
    root = Path(root)
    cfg = json.loads((root / 'carousel.json').read_text(encoding='utf-8-sig'))
    audio = cfg.get('audio', {})
    if cfg.get('music'):
        raise ValueError('Migrate music to audio.bgm and register its file in assets/sfx + sfx_manifest.json')
    for name in cfg.get('slides', []):
        cue = cfg.get('cues', {}).get(name, {})
        duration = cue.get('dur', MOTION_DEMO.get(name, (6, {}))[0])
        triggers = cfg.get('visual_triggers', {}).get(name)
        if triggers is None:
            if cfg.get('mode') == 'photo':
                # Same cues consumed by the photo visual renderer.
                triggers = {f'hit-{i}':t for i,t in enumerate(cue.get('hits',[]))}
                triggers.update({f'shine-{i}':t for i,t in enumerate(cue.get('shine',[]))})
            else:
                triggers = {}  # No hidden demo timing for rewritten slides.
        settings = {k:v for k,v in audio.items() if k != 'slides'}
        settings.update(audio.get('slides',{}).get(name,{}))
        if 'events' not in settings:
            settings['events'] = [{'trigger':key,'synthetic':'soft'} for key in triggers]
        render_audio(root,duration,triggers,settings,root/'audio/out'/name)
        print(f'{name}: BGM stem, SFX stem and normalized mix written')
