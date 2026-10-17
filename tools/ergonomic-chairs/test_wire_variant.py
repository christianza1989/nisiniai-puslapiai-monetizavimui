import unittest
from xml.etree import ElementTree as ET
from verify_structure_wire import verify_initial_variant


class VariantTests(unittest.TestCase):
    def test_manufacturer_default_has_no_variant_element(self):
        verify_initial_variant(ET.fromstring('<insertInfo/>'),'')
    def test_missing_or_changed_nonempty_variant_is_rejected(self):
        for xml in ['<insertInfo/>','<insertInfo><ofmlVariantCode>A=OTHER</ofmlVariantCode></insertInfo>']:
            with self.assertRaisesRegex(ValueError,'ORIGINAL_INITIAL_VARIANT_BINDING'):
                verify_initial_variant(ET.fromstring(xml),'A=VALUE')
    def test_only_native_leading_digit_escape_is_removed(self):
        verify_initial_variant(ET.fromstring('<insertInfo><ofmlVariantCode>A=4T;B=_WORD</ofmlVariantCode></insertInfo>'),'A=_4T;B=_WORD')
        with self.assertRaises(ValueError):verify_initial_variant(ET.fromstring('<insertInfo><ofmlVariantCode>A=WORD</ofmlVariantCode></insertInfo>'),'A=_WORD')


if __name__=='__main__':unittest.main()
