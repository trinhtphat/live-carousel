import json
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave
import numpy as np

SKILL = Path(__file__).resolve().parents[1]


class WorldDraftTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'audio').mkdir()
        (self.root / 'assets/sfx').mkdir(parents=True)
        shutil.copy2(SKILL / 'scripts/audio_pipeline.py', self.root / 'audio/audio_pipeline.py')
        with wave.open(str(self.root / 'assets/sfx/soft.wav'), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(48000)
            f.writeframes((np.ones(4800) * 8000).astype('<i2').tobytes())
        (self.root / 'sfx_manifest.json').write_text(json.dumps({'schema_version': 1, 'sounds': [
            {'source': 'fixture', 'filename': 'soft.wav', 'category_group': 'subtle',
             'duration_ms': 100, 'volume_level': 0.1, 'license_status': 'user_confirmed'}
        ]}), encoding='utf-8')

    def test_world2d_cover_draft_does_not_require_second_slide_audio(self):
        (self.root / 'audio/plan.json').write_text(json.dumps({'slides': {
            'slide-01': {'audio': {'profile': 'subtle', 'events': [
                {'trigger': 'shake-0', 'sfx': 'soft.wav'}]}}
        }}), encoding='utf-8')
        (self.root / 'renders/draft/raw').mkdir(parents=True)
        (self.root / 'renders/draft/raw/slide-01.mp4').write_bytes(b'raw')
        hits = {'loop': 1, 'slides': [
            {'shakes': [[0.4, 1]], 'flashes': []},
            {'shakes': [[0.5, 1]], 'flashes': []}
        ]}

        def external(command, **kwargs):
            if command[0] == 'node':
                (self.root / 'audio/hits.json').write_text(json.dumps(hits), encoding='utf-8')
            elif command[0] == 'ffmpeg':
                Path(command[-1]).write_bytes(b'draft-mux')
            return subprocess.CompletedProcess(command, 0)

        argv = ['add_sound.py', str(self.root), '--only', 'slide-01',
                '--video-dir', 'renders/draft/raw', '--output-dir', 'renders/draft']
        with patch.object(sys, 'argv', argv), patch('subprocess.run', side_effect=external):
            runpy.run_path(str(SKILL / 'engines/world2d/scripts/add_sound.py'), run_name='__main__')
        self.assertEqual((self.root / 'renders/draft/slide-01.mp4').read_bytes(), b'draft-mux')
        self.assertFalse((self.root / 'renders/final/slide-01.mp4').exists())
        self.assertFalse((self.root / 'audio/out/slide-02.wav').exists())

    def test_world3d_cover_audio_does_not_require_second_slide_plan(self):
        (self.root / 'carousel.json').write_text(json.dumps({'slides': ['01-hook', '02-body'], 'loop': 1}), encoding='utf-8')
        (self.root / 'audio/plan.json').write_text(json.dumps({'slides': {
            '01-hook': {'visual_triggers': {'reveal': 0.4},
                        'audio': {'events': [{'trigger': 'reveal', 'sfx': 'soft.wav'}]}}
        }}), encoding='utf-8')
        argv = ['make_audio.py', '01-hook']
        with patch.object(sys, 'argv', argv), patch('pathlib.Path.cwd', return_value=self.root):
            runpy.run_path(str(SKILL / 'engines/world3d/kit/tools/make_audio.py'), run_name='__main__')
        self.assertTrue((self.root / 'audio/out/01-hook.wav').exists())
        self.assertFalse((self.root / 'audio/out/02-body.wav').exists())

    def test_world3d_draft_mux_uses_draft_directory(self):
        node = shutil.which('node')
        if not node:
            self.skipTest('Node is unavailable')
        tools = self.root / 'tools'
        tools.mkdir()
        shutil.copy2(SKILL / 'engines/world3d/kit/tools/mux.mjs', tools / 'mux.mjs')
        (tools / 'chrome.mjs').write_text(
            "export const NAMES=['01-hook','02-body']; export const LOOP=1; "
            "export const pickSlides=x=>x==='1'?[1]:[1,2];", encoding='utf-8')
        result = subprocess.run([node, str(tools / 'mux.mjs'), '1', '--draft'],
                                cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.root / 'renders/draft').is_dir())
        self.assertFalse((self.root / 'renders/final').exists())
        all_draft = subprocess.run([node, str(tools / 'mux.mjs'), '--draft'],
                                   cwd=self.root, capture_output=True, text=True)
        self.assertNotEqual(all_draft.returncode, 0)
        self.assertIn('exactly one', all_draft.stderr)


if __name__ == '__main__':
    unittest.main()
