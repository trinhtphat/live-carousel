import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import wave
import numpy as np

MODULE = Path(__file__).resolve().parents[1] / 'scripts/audio_pipeline.py'

class AudioTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(MODULE.exists(), 'shared audio pipeline must exist')
        spec = importlib.util.spec_from_file_location('audio_pipeline', MODULE)
        self.api = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.api)
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'assets/sfx').mkdir(parents=True)
        self.entry = dict(source='test fixture', filename='click.wav', category_group='tech', duration_ms=100, volume_level=0.9, license_status='user_confirmed')
        self.extra_entries = []
        with wave.open(str(self.root / 'assets/sfx/click.wav'), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(48000)
            f.writeframes((np.ones(4800) * 32000).astype('<i2').tobytes())
        self.manifest()

    def manifest(self):
        (self.root / 'sfx_manifest.json').write_text(json.dumps({'schema_version':1,'sounds':[self.entry, *self.extra_entries]}))

    def add_music(self):
        path = self.root / 'assets/sfx/music.wav'
        with wave.open(str(path), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(48000)
            f.writeframes((np.ones(48000) * 30000).astype('<i2').tobytes())
        self.extra_entries.append(dict(source='test fixture', filename='music.wav', category_group='bgm', duration_ms=1000, volume_level=0.9, license_status='user_confirmed'))
        self.manifest()

    def render(self, audio=None, triggers=None):
        return self.api.render_audio(self.root, 1, triggers or {'reveal':0.4}, audio or {}, self.root / 'out/slide')

    def test_default_separate_stems_and_trigger_timing(self):
        self.entry['category_group'] = 'subtle'; self.manifest()
        out = self.render({'events':[{'trigger':'reveal','sfx':'click.wav'}]})
        self.assertEqual(out['mix'].shape, (48000,2))
        self.assertEqual(np.max(np.abs(out['sfx'][:19200])),0)
        self.assertGreater(np.max(np.abs(out['sfx'][19200:])),0)
        for suffix in ['.wav','.bgm.wav','.sfx.wav']:
            self.assertTrue((self.root / ('out/slide'+suffix)).exists())
        np.testing.assert_allclose(out['mix'],out['bgm']+out['sfx'])

    def test_manifest_and_all_files_are_required(self):
        (self.root / 'sfx_manifest.json').unlink()
        with self.assertRaises(ValueError): self.render()
        self.manifest()
        (self.root / 'assets/sfx/extra.wav').write_bytes(b'bad')
        with self.assertRaises(ValueError): self.render()

    def test_unsafe_paths_and_missing_fields_rejected(self):
        for filename in ['../click.wav','C:/outside.wav']:
            self.entry['filename']=filename; self.manifest()
            with self.assertRaises(ValueError): self.render()
        self.entry['filename']='click.wav'; del self.entry['source']; self.manifest()
        with self.assertRaises(ValueError): self.render()

    def test_unknown_license_blocks_playback(self):
        self.entry['license_status']='unverified'; self.manifest()
        with self.assertRaises(ValueError):
            self.render({'profile':'tech','custom_style_requested':True,'events':[{'trigger':'reveal','sfx':'click.wav'}]})

    def test_custom_profile_requires_explicit_request(self):
        with self.assertRaises(ValueError): self.render({'profile':'tech'})
        with self.assertRaises(ValueError): self.render({'events':[{'trigger':'reveal','sfx':'click.wav'}]})

    def test_custom_click_allowed_and_overlap_normalized(self):
        out=self.render({'profile':'tech','custom_style_requested':True,'events':[{'trigger':'reveal','sfx':'click.wav'}]*30})
        self.assertGreater(np.max(np.abs(out['sfx'])),0)
        for track in out.values(): self.assertLessEqual(np.max(np.abs(track)),0.891251)
        np.testing.assert_allclose(out['mix'],out['bgm']+out['sfx'])

    def test_unmapped_and_invalid_trigger_fail(self):
        for event in [{'trigger':'missing','synthetic':'soft'}, {'at':0.5,'synthetic':'soft'}]:
            with self.assertRaises(ValueError): self.render({'events':[event]})
        with self.assertRaises(ValueError): self.render({'events':[{'trigger':'reveal','synthetic':'soft'}]}, {'reveal':2})

    def test_external_bgm_requires_license(self):
        with self.assertRaises(ValueError): self.render({'bgm':{'file':'assets/sfx/click.wav'}})

    def test_bgm_cannot_override_unverified_manifest(self):
        self.entry['license_status']='unverified'; self.entry['category_group']='bgm'; self.manifest()
        with self.assertRaises(ValueError): self.render({'bgm':{'file':'click.wav','license_status':'user_confirmed'}})

    def test_licensed_manifest_bgm_plays(self):
        self.entry['category_group']='bgm'; self.manifest()
        path = self.root / 'assets/sfx/soft.wav'
        with wave.open(str(path), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(48000)
            f.writeframes((np.ones(4800) * 8000).astype('<i2').tobytes())
        self.extra_entries.append(dict(source='test fixture', filename='soft.wav', category_group='subtle', duration_ms=100, volume_level=0.1, license_status='user_confirmed'))
        self.manifest()
        out=self.api.render_audio(self.root,.08,{'reveal':0.01}, {'bgm':{'file':'click.wav'},'events':[{'trigger':'reveal','sfx':'soft.wav'}]},self.root/'music')
        self.assertGreater(np.max(out['bgm']),0)

    def test_empty_or_synthetic_only_events_do_not_meet_library_requirement(self):
        with self.assertRaisesRegex(ValueError, 'library SFX'):
            self.render()
        with self.assertRaisesRegex(ValueError, 'library SFX'):
            self.render({'events':[{'trigger':'reveal','synthetic':'soft'}]})

    def test_silent_library_sfx_is_rejected(self):
        with wave.open(str(self.root / 'assets/sfx/click.wav'), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(48000)
            f.writeframes(np.zeros(4800, dtype='<i2').tobytes())
        with self.assertRaisesRegex(ValueError, 'silent'):
            self.render({'profile':'tech','custom_style_requested':True,'events':[{'trigger':'reveal','sfx':'click.wav'}]})

    def test_bgm_yields_to_library_sfx_at_event(self):
        self.add_music()
        out = self.render({'profile':'tech','custom_style_requested':True,'bgm':{'file':'music.wav','gain':0.8},'events':[{'trigger':'reveal','sfx':'click.wav','gain':0.3}]})
        region = slice(19200, 24000)
        bgm_rms = np.sqrt(np.mean(out['bgm'][region]**2))
        sfx_rms = np.sqrt(np.mean(out['sfx'][region]**2))
        self.assertLessEqual(bgm_rms, 0.5 * sfx_rms)
        np.testing.assert_allclose(out['mix'], out['bgm'] + out['sfx'])

    def test_bgm_duration_must_match_manifest(self):
        self.entry['category_group']='bgm'; self.entry['duration_ms']=900; self.manifest()
        with self.assertRaisesRegex(ValueError,'duration'):
            self.api.render_audio(self.root,.08,{}, {'bgm':{'file':'click.wav'}},self.root/'music')

if __name__=='__main__': unittest.main()
