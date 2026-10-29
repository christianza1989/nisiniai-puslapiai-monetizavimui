# Existing o3tech visual system

Mode: Persuade for homepage/service, Read for information, catalogue for products. Preserve the incumbent identity; the user explicitly requests an identical or very similar result.

Baseline: live homepage inspected2026-10-29; screenshot `D:/Core/output/o3tech-assessment-20261029.png`; actual computed roles in private `baseline-browser.json`. White header and main canvas, light turquoise bubble backgrounds, original o3tech logo, Open Sans, teal headings, original product photos and category imagery. Hero: text panel left, circular image composition right. Subsequent sections: four categories, rental text/photo, five benefit icons, contacts, inquiry form, pale blue footer. The original entrance effects hide some lazy assets in an early screenshot; the migrated version must show real images without JavaScript reveal dependencies.

One scoped token system: Open Sans400/600/700 with real Lithuanian glyph coverage; body1rem/1.8 and #595959; display2.5rem/1.1; section2rem/1.25; subtitle1.375rem/1.4; labels/nav.875rem/1.5. Heading #175357/#276d72; background #e1f2f5; action #247f94 with white label for usable contrast. Main width1140px, long prose up to75ch, desktop hero two columns, mobile single column. Preserve original backgrounds and image crops. Small source captions are not invented.

Typography/interaction plan:
- [x] Inventory homepage, catalogue, product, long information/legal content, navigation and forms from actual source.
- [ ] Inspect self-hosted Open Sans glyphs/actual weights, hierarchy, line breaks and contrast.
- [ ] Inspect desktop,390/320px, expanded native menu, product gallery, form validation, long titles and footer.
- [ ] Exercise200%text enlargement and simultaneous text-spacing overrides; record actual mechanism and limits.
- [ ] Fix verified defects together and perform one confirmation batch.

New UI is native semantic HTML/CSS; no WordPress, Elementor, jQuery, WooCommerce, recaptcha or legacy tracker runtime. Existing exact words come from imported drafts, not a second hardcoded content store. Product/category cards preserve source ordering. A native details menu and image links work without client bundles. Catalogue has no order/cart/checkout/quantity/stock simulation.
