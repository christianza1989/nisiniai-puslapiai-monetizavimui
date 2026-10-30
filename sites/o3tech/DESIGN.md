# Existing o3tech visual system

Mode: Persuade for homepage/service, Read for information, catalogue for products. Preserve the incumbent identity and exact words. On 2026-10-30 the owner explicitly superseded pixel fidelity with a request for modern presentation, soft transitions and purposeful movement; the earlier source comparisons remain historical evidence.

Baseline: live homepage inspected2026-10-29; screenshot `D:/Core/output/o3tech-assessment-20261029.png`; actual computed roles in private `baseline-browser.json`. White header and main canvas, light turquoise bubble backgrounds, original o3tech logo, Open Sans, teal headings, original product photos and category imagery. Hero: text panel left, circular image composition right. Subsequent sections: four categories, rental text/photo, five benefit icons, contacts, inquiry form, pale blue footer. The original entrance effects hide some lazy assets in an early screenshot; the migrated version must show real images without JavaScript reveal dependencies.

One scoped token system: Open Sans400/600/700 with real Lithuanian glyph coverage; body1rem/1.8 and #595959; display2.5rem/1.1; section2rem/1.25; subtitle1.375rem/1.4; labels/nav.875rem/1.5. Heading #175357/#276d72; background #e1f2f5; action #247f94 with white label for usable contrast. Main width1140px, long prose up to75ch, desktop hero two columns, mobile single column. Preserve original backgrounds and image crops. Small source captions are not invented.

Typography/interaction plan:
- [x] Inventory homepage, catalogue, product, long information/legal content, navigation and forms from actual source.
- [x] Inspect self-hosted Open Sans glyphs/actual weights, hierarchy, line breaks and contrast; original blue/white is an owner-fidelity exception.
- [x] Inspect desktop,390/320px, expanded native menu, product gallery, form validation, long titles and footer.
- [x] Actual Chrome200%zoom measured1440→720/DPR2, six families and keyboard menus fit; original mobile hero/inquiry hiding remains a content-preservation limitation. Physical touch/Safari remain unverified. See RE-AUDIT.md.
- [x] Fix verified defects together and confirm the concrete repairs.

New UI is native semantic HTML/CSS; no WordPress, Elementor, jQuery, WooCommerce, recaptcha or legacy tracker runtime. Existing exact words come from imported drafts, not a second hardcoded content store. Product/category cards preserve source ordering. A native details menu and image links work without client bundles. Catalogue has no order/cart/checkout/quantity/stock simulation.

## Owner-requested fidelity repair 2026-10-29
- [x] Restore source homepage geometry/typography/images/icons, native menu appearance, and source mobile visibility/one-column grids.
- [x] Restore blue/white about-page sections and four preparation columns; exact rental price cards; three-column catalogue/sidebar/filter and product gallery/related navigation.
- [x] Preserve original inline formatting, ordered lists and bound source links using text-signature-checked presentation metadata; never a second prose store.
- [x] Retain original words/contacts/URLs and common publication gates; no cart/checkout, tracker or plugin runtime.
- [x] Confirm desktop1440/mobile390/320, loaded font weights/glyphs, gallery/filter/menu states, text-spacing and native build/tenant regression. Repeat audit adds source1024menu,560legal measure, native-size gallery/photos, intrinsic background scale and actual Chrome zoom with explicit content-hiding limits. Audit baseline is private/visual-audit-20261029/ATASKAITA.md, not a PASS.

The fidelity repair supersedes the initial approximate token choices above: native body14px/1.8, homepage/information/rental/legal prose16px/1.8, header16px600, hero40px500/1, section32px400/1, benefit20px600/1.4, product title24px600/1.4, original#43a7c5actions/#5ebed6intro and offer headers. Normal/italic300–700 are real self-hosted faces. The 1140px source grid, 60/40hero, three-column catalogue and per-page composition are maintained in the site CSS; mobile follows source visibility/one-column rules. Original blue/white contrast is a fidelity exception, not an accessibility100 claim. Current repair evidence and intentional differences: [FIDELITY.md](FIDELITY.md).

## Current presentation · 2026-10-30

[MODERNIZATION.md](MODERNIZATION.md) is current visual authority. The clear-air refinement retains the original logo, photographs, bubble imagery, Open Sans and every rendered word/link target across23routes. Current body16/1.8, ink#36565d, heading#164b55, action#176f82 and surface#edf7f8 replace the older fidelity-only choices. Hero42/1.16desktop and32/1.2mobile; section32/1.25desktop and28/1.25mobile; benefit16/1.5desktop and14/1.5mobile. Mobile information/rental titles32/1.25. Real variable faces retain Lithuanian coverage.

Hero background dissolves into white; its original photographic composition resolves from bounded blur once, with sharp text throughout. The mobile picture appears after the title, before the preserved long copy. Header stays available, action/field contrast improves, and all mobile hero/inquiry/service content is restored. Native catalogue disclosure defaults closed on mobile and opens on desktop; without UI JavaScript it remains a usable native control. Category labels shrink/wrap safely under increased text spacing, including the decorative arrow.

No continuous decorative animation, scroll loop, new runtime dependency or new copy. Default HTML is readable, reduced-motion changes cancel active photo animations, and hidden pages cancel motion. Static background blur is omitted on mobile. State/reflow/keyboard/no-UI-script and local mobile Lighthouse evidence are scoped in MODERNIZATION; actual200%browserzoom this round is UNVERIFIED after automation timed out. No physicaltouch/Safari or production acceptance is implied.
