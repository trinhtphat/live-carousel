"""Manifest-gated two-track mixer. Requires numpy; compressed audio needs ffmpeg.

render_audio(root, duration, visual_triggers, audio, output_prefix) writes the
mixed .wav and separate .bgm.wav/.sfx.wav stems. Trigger times are in seconds.
The caller must use the SAME visual_triggers for the animation and audio.
"""
import json
import math
from pathlib import Path, PureWindowsPath
import subprocess
import wave
import numpy as np

SR = 48000
CEILING = 10 ** (-1 / 20)
LICENSES = {'user_confirmed', 'licensed', 'public_domain', 'cc0'}
PROFILES = {'subtle', 'smooth', 'game', 'tech', 'cinematic'}
EXTENSIONS = {'.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac', '.aiff', '.aif', '.opus'}

def number(value, name, low=0, high=None):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < low or (high is not None and value > high):
        raise ValueError(f'Invalid {name}: {value!r}')
    return float(value)

def contained(base, filename):
    if not isinstance(filename, str) or not filename or PureWindowsPath(filename).is_absolute() or PureWindowsPath(filename).drive:
        raise ValueError('Audio filename must be relative')
    path = (base / filename).resolve()
    if not path.is_relative_to(base.resolve()) or '..' in Path(filename.replace('\\', '/')).parts:
        raise ValueError('Audio path escapes its library')
    return path

def validate_manifest(root):
    root = Path(root)
    try:
        data = json.loads((root / 'sfx_manifest.json').read_text(encoding='utf-8-sig'))
    except (OSError, ValueError) as error:
        raise ValueError('A readable root sfx_manifest.json is mandatory') from error
    if data.get('schema_version') != 1 or not isinstance(data.get('sounds'), list):
        raise ValueError('Unsupported SFX manifest schema')
    assets = root / 'assets/sfx'
    registered = {}
    fields = {'source','filename','category_group','duration_ms','volume_level','license_status'}
    for item in data['sounds']:
        if not isinstance(item, dict) or not fields.issubset(item):
            raise ValueError('Every SFX needs all six manifest fields')
        path = contained(assets, item['filename'])
        if path in registered or not path.is_file() or path.suffix.lower() not in EXTENSIONS:
            raise ValueError(f'Duplicate, missing or unsupported SFX: {path}')
        if not isinstance(item['source'], str) or not item['source'].strip():
            raise ValueError('SFX source is required')
        if item['category_group'] not in PROFILES | {'bgm'} or not isinstance(item['license_status'], str):
            raise ValueError('Invalid category or license status')
        number(item['duration_ms'], 'duration_ms', 0.001)
        number(item['volume_level'], 'volume_level', 0, 1)
        registered[path] = item
    actual = {p.resolve() for p in assets.rglob('*') if p.is_file() and p.suffix.lower() in EXTENSIONS}
    if actual != set(registered):
        raise ValueError('Every audio file under assets/sfx must be registered')
    return registered

def read_audio(path):
    """Decode stereo float data without persistent caches or shell commands."""
    try:
        with wave.open(str(path), 'rb') as f:
            if f.getsampwidth() != 2: raise wave.Error('decode via ffmpeg')
            channels, rate = f.getnchannels(), f.getframerate()
            x = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').astype(float).reshape(-1, channels) / 32768
        if channels == 1: x = np.repeat(x, 2, axis=1)
        x = x[:, :2]
        if rate != SR:
            positions = np.arange(int(len(x)*SR/rate)) * rate / SR
            x = np.stack([np.interp(positions, np.arange(len(x)), x[:,c]) for c in range(2)], axis=1)
    except (wave.Error, EOFError):
        raw = subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ar',str(SR),'-ac','2','pipe:1'], check=True, capture_output=True).stdout
        x = np.frombuffer(raw, dtype='<f4').astype(float).reshape(-1,2)
    if not len(x) or not np.isfinite(x).all(): raise ValueError('Empty or invalid audio')
    return x

def normalize(x, ceiling):
    peak = float(np.max(np.abs(x))) if x.size else 0
    return x * (ceiling / peak) if peak else x.copy()

def write_wav(path, x):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((x * 32767).astype('<i2').tobytes())

def render_audio(root, duration, visual_triggers, audio, output_prefix):
    root = Path(root).resolve()
    duration = number(duration, 'duration', 0.01)
    registry = validate_manifest(root)
    profile = audio.get('profile', 'subtle').lower()
    if profile not in PROFILES: raise ValueError('Unknown audio profile')
    custom = profile in {'game','tech','cinematic'}
    if custom and audio.get('custom_style_requested') is not True:
        raise ValueError('Custom style requires an explicit request recorded from the approved brief')
    n = round(duration * SR)
    t = np.arange(n) / SR
    # Integer loop periods and soft envelope avoid an abrupt loop boundary.
    envelope = np.sin(np.pi * np.arange(n) / max(1,n-1)) ** 2
    base = sum(np.sin(2*np.pi*(round(hz*duration)/duration)*t) for hz in (130.81,164.81,196)) / 3
    bgm = np.repeat((base * envelope * .12)[:,None], 2, axis=1)
    music = audio.get('bgm')
    if music:
        music_path = contained(root / 'assets/sfx',music['file'])
        if music_path not in registry or registry[music_path]['license_status'] not in LICENSES:
            raise ValueError('BGM must be registered with a confirmed license in sfx_manifest.json')
        if registry[music_path]['category_group'] != 'bgm': raise ValueError('BGM must have category_group bgm')
        sample = read_audio(music_path)
        expected_ms = registry[music_path]['duration_ms']
        if abs(len(sample)/SR*1000-expected_ms) > max(50, expected_ms*.02):
            raise ValueError('BGM duration does not match manifest')
        start = round(number(music.get('start',0),'BGM start') * SR)
        if start+n > len(sample): raise ValueError('BGM is shorter than the requested window')
        bgm = normalize(sample[start:start+n], min(number(music.get('gain',.2),'BGM gain',0,1), registry[music_path]['volume_level']))
        fade = min(round(.02*SR),n//2)
        bgm[:fade] *= np.linspace(0,1,fade)[:,None]
        bgm[-fade:] *= np.linspace(1,0,fade)[:,None]
    sfx = np.zeros((n,2))
    for event in audio.get('events',[]):
        trigger = event.get('trigger')
        if trigger not in visual_triggers: raise ValueError('Every SFX must reference an existing visual trigger')
        when = number(visual_triggers[trigger], 'visual trigger time',0,duration)
        if when >= duration: raise ValueError('Visual trigger must be inside the slide')
        if ('sfx' in event) == ('synthetic' in event): raise ValueError('Choose one SFX file or synthetic soft event')
        if 'sfx' in event:
            path = contained(root / 'assets/sfx',event['sfx'])
            if path not in registry: raise ValueError('SFX is missing from the manifest')
            entry = registry[path]
            if entry['license_status'] not in LICENSES: raise ValueError('SFX license is unverified')
            if entry['category_group'] == 'bgm': raise ValueError('BGM assets belong on Track 1')
            if not custom and entry['category_group'] not in {'subtle','smooth'}:
                raise ValueError('Aggressive SFX requires a custom style in the approved brief')
            sample = read_audio(path)
            if abs(len(sample)/SR*1000-entry['duration_ms']) > max(50,entry['duration_ms']*.02):
                raise ValueError('SFX duration does not match manifest')
            gain = number(event.get('gain', entry['volume_level']),'SFX gain',0,1)
            gain = min(gain,entry['volume_level'],1 if custom else .15)
        else:
            if event['synthetic'] != 'soft': raise ValueError('Only the gentle synthetic soft event is supported')
            st = np.arange(round(.18*SR))/SR
            sample = np.repeat((np.sin(2*np.pi*330*st)*np.sin(np.pi*st/.18)**2)[:,None],2,axis=1)
            gain = min(number(event.get('gain',.08),'SFX gain',0,1),1 if custom else .15)
        sample = normalize(sample,gain)
        start = round(when*SR)
        # Wrap tails to preserve loop length. Timing remains anchored to its visual trigger.
        np.add.at(sfx, (start+np.arange(len(sample))) % n, sample)
    # Attenuate sums, never boost quiet beds. Preserve stem additivity.
    sfx_peak = np.max(np.abs(sfx))
    cap = .22 if not custom else CEILING
    if sfx_peak > cap: sfx *= cap/sfx_peak
    mix = bgm+sfx
    peak = max(np.max(np.abs(mix)),np.max(np.abs(bgm)),np.max(np.abs(sfx)))
    if peak > CEILING:
        bgm *= CEILING/peak; sfx *= CEILING/peak
    mix = bgm+sfx
    output_prefix = Path(output_prefix)
    for suffix, track in [('.bgm.wav',bgm),('.sfx.wav',sfx),('.wav',mix)]:
        write_wav(Path(str(output_prefix)+suffix),track)
    return {'bgm':bgm,'sfx':sfx,'mix':mix}
