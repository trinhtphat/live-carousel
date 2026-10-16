import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('build',ROOT/'templates/common/build.py')
build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)

class BrandTests(unittest.TestCase):
    def test_palette_swaps_simultaneously(self):
        # Lime accent equals another base value: replacements must not cascade.
        self.assertEqual(build.apply_theme('#2041f2 #ff6a1f',{'hero':'#ff6a1f','accent':'#123456'}),'#ff6a1f #123456')
    def test_font_alias_preserves_font_sources(self):
        html='@font-face {font-family: "Anybody";src:url("Anybody-Var.woff2")} .big{font-family:"Anybody"} mc.font=`900 90px Anybody`;'
        result=build.apply_typography(html,{'display':'Hanken Grotesk','serif':'Instrument Serif','mono':'IBM Plex Mono'},ROOT/'templates/common/fonts.css')
        self.assertIn('Anybody-Var.woff2',result)
        self.assertIn('font-family:"LCDisplay"',result)
        self.assertIn('font-family: "LCDisplay"',result)
        self.assertIn('HankenGrotesk',result)

    def test_vietnamese_uses_complete_serif_face(self):
        result=build.apply_typography('<head></head><i>Tiếng Việt</i>',{'serif':'Instrument Serif'},ROOT/'templates/common/fonts.css')
        self.assertIn('Fraunces-Italic[SOFT,WONK,opsz,wght].ttf',result)
        self.assertNotIn('InstrumentSerif-Italic.ttf',result)

if __name__=='__main__': unittest.main()
