# PhoneBridger holder photography — eight-image plan

Status: references reviewed; no holder imagery generated yet. Website and product copy are English. The shop offers App only, App + 1 holder, App + 2 holders and App + 3 holders. Colours confirmed by the owner: black and silver.

## Construction to preserve

The provided references show a thin two-part metal holder with a central barrel hinge, a rounded phone plate with a narrower neck, and a circular mounting plate with four elongated cross-shaped openings and a small centre hole. A dark pad covers the mounting plate. Preserve the silhouette, openings, hinge, plate thickness and attachment arrangement in every image. Show the actual laptop-back mounting arrangement, rather than an invented desk cradle or edge clamp. The supplied images show portrait and landscape phones and top/side mounting.

The owner's marked image (`codex-clipboard-6b9674e6-0c16-46d4-99dd-bb75434b7955.png`) fixes the logo position: centred on the broad upper metal face of the phone plate, above the narrower neck. Use the existing `homepage/assets/brand-mark.svg` geometry: two overlapping rounded outline squares, lower-left and upper-right. Depress the outlines into the metal, with restrained real highlights and shadows. No red/pink paint, sticker, raised badge, wordmark or Mount-It text. The mark rotates naturally with the plate in each view. Do not put the mark near the hinge as previously proposed.

The silver reference is relatively dark grey; the owner has requested silver. Render satin silver and matte/satin black with identical geometry. Supplier image dimensions are reference annotations, not verified manufacturing specifications. Do not publish dimensions, load capacity, magnet strength, adhesive performance or universal compatibility without confirmation.

## Shared art direction

Dark charcoal, soft neutral key light, restrained pink light reflected from the workspace, realistic brushed/satin metal, clean edges and generous breathing room. Match the homepage's warm desk atmosphere. Product colour must remain readable; pink is a lighting accent, not a colour cast covering the whole holder. Android phones and an unbranded dark Windows laptop in lifestyle views. No tiny UI copy, invented awards, watermarks, third-party logos or marketing text baked into photos.

| # | Image | Composition and purpose | Format |
|---|---|---|---|
| 01 | Black holder — main product | One black holder opened roughly 95–110°, front three-quarter angle. Both plate shapes, cross openings, hinge and recessed logo visible. Soft neutral highlights with a faint pink edge. Main shop image and black variant selector. | 1:1, transparent master; charcoal background in page |
| 02 | Silver holder — matched product | Exactly the same framing, scale, opening angle and lighting as 01, in satin silver. Match geometry carefully so changing colours does not make the product jump. Main shop image and silver variant selector. | 1:1, transparent master |
| 03 | Logo and metal detail | Tight diagonal close-up of the upper face, recessed overlapping-square logo in sharp focus, grain and bevel visible. Include enough outer rim to explain the location. Silver version gives the clearest relief; a second black detail can be derived later. | 4:3, dark studio background |
| 04 | Folded profile | Black and silver holders folded flat, placed in parallel at a slight diagonal, one seen from the side and one at three-quarter angle. Show the real hinge and slim folded structure without exaggerating thinness. | 4:3, dark studio background |
| 05 | One holder in use — side | Android phone in portrait beside a laptop, mounted by the real holder on the back of the lid. View from rear three-quarter so the attachment and hinge are understandable. Calm homepage desk styling. | 4:3, lifestyle |
| 06 | One holder in use — above | Android phone in landscape above the laptop. Rear/side three-quarter view reveals the real bracket attachment and respects the laptop lid thickness. Show the holder, rather than hiding it entirely behind screens. | 4:3, lifestyle |
| 07 | Complete workspace — three holders | Wide front three-quarter desk view: portrait phones left and right, landscape phone above, dark Windows laptop in the centre. A secondary rear-view inset may be built separately in HTML, not hallucinated into the photo. Useful for the three-holder bundle and conversion section. | 16:9, lifestyle |
| 08 | What comes in the setup | Neat overhead studio arrangement of three real holders, with one black and two silver to display both finishes. Clearly separated and identical in scale, one folded, two opened. No invented cable, box, ring, adhesive spare or accessory until package contents are confirmed. Bundle quantities should be shown through HTML copy/variants. | 4:3, product group |

## First two generation trials

Generate 01 first to validate shape, hinge, cross openings and the exact recessed mark. Then generate 02 using the selected 01 as a composition reference and the real silver photograph as a material reference. Review both together before producing detail and lifestyle images. Revisions should change one concrete defect at a time. Keep every selected original; produce responsive WebP variants with the shared image pipeline only after approval of composition.

For each trial include three explicit input roles: (1) real holder photograph is the construction reference; (2) owner's marked photograph is the logo-placement reference; (3) the actual PhoneBridger mark, raster-rendered from its SVG, is the exact logo geometry reference. The marked red sketch is positional guidance only; it must not become the final colour or shape style. Existing Mount-It lettering must be absent. Lifestyle photos use the supplied mounting references too; do not use the preliminary shop layout's generic desk stands as construction references.

## Acceptance checklist

- [x] All unique reference images reviewed; duplicate `1141129107 (1)` identified.
- [x] Black and silver variants confirmed; four commercial bundle options confirmed.
- [x] Upper-face logo position confirmed by the owner's marked image.
- [ ] Trial black product image generated and visually reviewed.
- [ ] Trial silver image generated with matching composition and logo.
- [ ] Owner evaluates the two trial images before the remaining six are generated.
- [ ] Package contents, dimensions, colour swatches and compatibility confirmed before factual shop descriptions.
- [ ] Responsive crops, alpha, edge quality, metal finish and unchanged construction reviewed in the actual page.

## Shop implementation sequence

1. Next homepage section: four bundle choices, holder colour choices, an accurate product image and an explicit summary of selected contents.
2. Local cart prototype: editable bundle/quantity/colour, remove and clear actions, preserved selection. Prices remain unconfigured until the owner supplies them; no fake checkout success.
3. Connect the shop to the existing shared system through its documented project boundaries. Reuse its product/order contracts where available; do not build a competing core.
4. Configure confirmed licence terms, currency, prices, stock, delivery regions and shipping rules, then the chosen payment provider and verified order webhooks.
5. A paid order must create the correct app entitlement and physical fulfilment record. Refunds and cancelled orders must reconcile both. Creator attribution must feed the existing referral/payout contracts, with real backend validation.
6. Verify real checkout in provider test mode, duplicate/replayed webhook handling, fulfilment, refund and referral accounting before production activation.

Open commercial facts: app licence model, prices/currency, holder unit cost, exact silver finish, box contents, mixed-colour bundle policy, stock, delivery countries, shipping price, payment provider and the existing core's shop contracts. These are not inferred from a layout concept.
