import importlib.util
import io
import json
from pathlib import Path
from contextlib import redirect_stderr
import sys
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / 'scripts/render_all.py'
PROJECT_AUDIO = Path(__file__).resolve().parents[1] / 'templates/common/audio/project_audio.py'


class DraftRenderTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('render_all', MODULE)
        self.api = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.api)
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'carousel.json').write_text(json.dumps({'slides': ['01-hook', '02-body'], 'title': 'Test'}), encoding='utf-8')
        (self.root / 'renders').mkdir()
        (self.root / 'renders/slide-01-hook.mp4').write_bytes(b'existing-final')
        (self.root / '.preview.template.html').write_text('<!--@VIDEOS@--><!--@DOTS@-->@N@ @TITLE@ @HANDLE@ @CAPTION@', encoding='utf-8')

    def run_cli(self, *args):
        commands = []
        def fake_run(cmd, cwd, quiet=False):
            commands.append(cmd)
            if 'render' in cmd:
                Path(cmd[cmd.index('-o') + 1]).write_bytes(b'draft-with-sound')
            return 0

        def fake_frame(src, t, out, w=360):
            Path(out).write_bytes(b'frame')

        def fake_stack(images, out, layout):
            Path(out).write_bytes(b'sheet')

        with patch.object(sys, 'argv', ['render_all.py', str(self.root), *args]), \
             patch.object(self.api, 'run', side_effect=fake_run), \
             patch.object(self.api, 'frame', side_effect=fake_frame), \
             patch.object(self.api, 'stack', side_effect=fake_stack), \
             patch.object(self.api, 'probe', return_value=(4.0, True)):
            self.api.main()
        return commands

    def test_cover_draft_generates_only_cover_audio(self):
        (self.root / 'audio').mkdir()
        (self.root / 'audio/make_audio.py').write_text('pass', encoding='utf-8')
        commands = self.run_cli('--draft', '--only', '01-hook')
        audio_commands = [cmd for cmd in commands if 'make_audio.py' in cmd]
        self.assertEqual(len(audio_commands), 1)
        self.assertEqual(audio_commands[0][-1], '01-hook')

    def test_cover_draft_keeps_existing_final_and_excludes_other_slides(self):
        self.run_cli('--draft', '--only', '01-hook')
        self.assertEqual((self.root / 'renders/slide-01-hook.mp4').read_bytes(), b'existing-final')
        self.assertEqual((self.root / 'renders/draft/slide-01-hook.mp4').read_bytes(), b'draft-with-sound')
        self.assertFalse((self.root / 'renders/draft/slide-02-body.mp4').exists())
        preview = (self.root / 'renders/draft/preview.html').read_text(encoding='utf-8')
        self.assertIn('slide-01-hook.mp4', preview)
        self.assertNotIn('slide-02-body.mp4', preview)

    def test_draft_requires_exactly_one_named_slide(self):
        for args in [('--draft',), ('--draft', '--only', '01-hook', '02-body')]:
            err = io.StringIO()
            with self.subTest(args=args), redirect_stderr(err), self.assertRaises(SystemExit):
                self.run_cli(*args)
            self.assertIn('exactly one', err.getvalue())
            self.assertFalse((self.root / 'renders/draft/slide-01-hook.mp4').exists())


class SelectedAudioTests(unittest.TestCase):
    def test_project_audio_renders_only_requested_cover(self):
        spec = importlib.util.spec_from_file_location('project_audio', PROJECT_AUDIO)
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'audio_pipeline': unittest.mock.MagicMock()}):
            spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'carousel.json').write_text(json.dumps({
                'slides': ['01-hook', '02-body'],
                'visual_triggers': {'01-hook': {'reveal': 1}},
                'audio': {'slides': {'01-hook': {'events': [{'trigger': 'reveal', 'sfx': 'hit.wav'}]}}},
            }), encoding='utf-8')
            with patch.object(module, 'render_audio') as render:
                module.render_project(root, only='01-hook')
            self.assertEqual(render.call_count, 1)
            self.assertEqual(render.call_args.args[-1], root / 'audio/out/01-hook')


if __name__ == '__main__':
    unittest.main()
