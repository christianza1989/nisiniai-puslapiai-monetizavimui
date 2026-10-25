import unittest
from audit_duplicates import variant_identity


class DuplicateIdentityTests(unittest.TestCase):
    def test_field_order_encoding_and_language_not_model_identity(self):
        a = 'https://configurator.nowystyl.com/#ban=K1&sid=A&ovc=K1_OPTIONS.ARM%3DR55%3BK1_FINISHES.COLOR%3DX&lang=en'
        b = 'https://configurator.nowystyl.com/#sid=A&ovc=K1_FINISHES.COLOR=X;K1_OPTIONS.ARM=R55&ban=K1&lang=pl'
        self.assertEqual(variant_identity(a), variant_identity(b))

    def test_different_colour_is_not_exact_duplicate(self):
        prefix = 'https://configurator.nowystyl.com/#ban=K1&sid=A&ovc=K1_FINISHES.COLOR='
        self.assertNotEqual(variant_identity(prefix+'X')[0], variant_identity(prefix+'Y')[0])

    def test_only_proven_numeric_enum_alias_normalized(self):
        prefix = 'https://configurator.nowystyl.com/#ban=K1&sid=A&ovc=P='
        self.assertEqual(variant_identity(prefix+'_4')[0], variant_identity(prefix+'4')[0])
        self.assertNotEqual(variant_identity(prefix+'_BLACK')[0], variant_identity(prefix+'BLACK')[0])

    def test_different_construction_is_not_exact_duplicate(self):
        prefix = 'https://configurator.nowystyl.com/#ban=K1&sid=A&ovc=K1_OPTIONS.ARM='
        self.assertNotEqual(variant_identity(prefix+'NONE')[0], variant_identity(prefix+'R55')[0])

    def test_missing_variant_or_conflicting_assignments_never_assumed_equal(self):
        self.assertIsNone(variant_identity('https://configurator.nowystyl.com/#ban=K1&sid=A')[0])
        self.assertIsNone(variant_identity('https://configurator.nowystyl.com/#ban=K1&sid=A&ovc=P=X;P=Y')[0])

    def test_different_series_or_host_is_not_same_product(self):
        a = 'https://configurator.nowystyl.com/#ban=K1&sid=A&ovc=P=X'
        self.assertNotEqual(variant_identity(a)[0], variant_identity(a.replace('sid=A','sid=B'))[0])
        self.assertNotEqual(variant_identity(a)[0], variant_identity(a.replace('configurator.nowystyl.com','example.com'))[0])


if __name__ == '__main__':
    unittest.main()
