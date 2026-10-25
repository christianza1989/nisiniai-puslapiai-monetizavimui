"""Regression checks for exact source backgrounds and rectangular frame crops."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np
from PIL import Image, ImageDraw
spec=importlib.util.spec_from_file_location('prepare',Path(__file__).with_name('prepare-product-images.py'))
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)

class BackgroundTests(unittest.TestCase):
    def chair(self):
        image=Image.new('RGB',(400,400),(244,244,244));draw=ImageDraw.Draw(image)
        draw.rectangle((150,70,240,330),fill=(245,245,245))
        draw.rectangle((160,90,230,180),fill=(70,70,70))
        draw.rectangle((168,110,221,162),fill=(244,244,244))
        draw.ellipse((125,318,265,348),fill=(238,238,238))
        return image
    def test_backdrop_white_parts_mesh_holes_and_shadows_are_unchanged(self):
        original=self.chair();result,treatment,rectangle=prepare.preserve_background(original)
        self.assertEqual(rectangle,(0,0,400,400));self.assertEqual(treatment,'source-background-preserved')
        np.testing.assert_array_equal(np.asarray(result),np.asarray(original))
    def test_distinct_outer_frame_is_the_only_crop(self):
        original=self.chair();frame=Image.new('RGB',(440,440),(255,255,255));frame.paste(original,(20,20))
        result,treatment,rectangle=prepare.preserve_background(frame)
        self.assertEqual(rectangle,(20,20,420,420));self.assertEqual(treatment,'outer-frame-cropped-background-preserved')
        np.testing.assert_array_equal(np.asarray(result),np.asarray(original))
    def test_uniform_source_padding_is_kept(self):
        original=Image.new('RGB',(400,400),(244,244,244));original.paste(self.chair().resize((240,240)),(80,80))
        result,_,rectangle=prepare.preserve_background(original)
        self.assertEqual(rectangle,(0,0,400,400));np.testing.assert_array_equal(np.asarray(result),np.asarray(original))
    def test_existing_source_transparency_is_not_changed(self):
        original=Image.new('RGBA',(100,100),(250,250,250,0));ImageDraw.Draw(original).rectangle((20,20,80,80),fill=(240,240,240,255))
        result,treatment,_=prepare.preserve_background(original)
        self.assertEqual(treatment,'source-alpha-preserved');np.testing.assert_array_equal(np.asarray(result),np.asarray(original))
    def test_nonuniform_photograph_is_not_cropped(self):
        original=Image.fromarray(np.random.default_rng(8).integers(0,255,(240,400,3),dtype=np.uint8))
        result,_,rectangle=prepare.preserve_background(original)
        self.assertEqual(rectangle,(0,0,400,240));np.testing.assert_array_equal(np.asarray(result),np.asarray(original))

if __name__=='__main__':unittest.main()
