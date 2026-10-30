# Original sliding illustrations and contact layout — 2026-10-30

The owner clarified the final behavior: images slide left like the original, without arrows, Play/Pause or manual control; contact field names belong inside fields, with the van aligned like the original. This supersedes the earlier manual controls and instant reduced-motion carousel policy.

The original live DOM was inspected directly. Both Elementor widgets declare navigation:none, effect:slide, speed500ms and autoplay2000ms. The site-scoped implementation now uses a native500ms ease transform animation with a cloned first frame for an invisible loop reset. The automatic interval remains2000ms. Buttons, input/scroll handlers, focus/pause state and unused control CSS are removed. The track rejects pointer interaction; the viewport clips overflow and contains no focusable controls. Timers and the active animation are cleared on unmount. This explicit owner motion is independent of the general reduced-motion CSS transition rule, without changing any system preference or other site's behavior.

The original contact layout aligns its natural van photo with the input block through the message box; its submit row is lower. At1280px, the original photo is550×372.75px and field heights are40,40.796875,40.796875,40.796875 and144.34375px with16px gaps. The repaired fields match those heights exactly. Native photo is549.984375×372.984375px; top offset1px and bottom offset3.25px match the original's approximately1/3px offsets. Grid areas align the photo with the first field without a heading-height magic margin. Mobile retains the natural photo aspect and stacked layout; dimensions differ from the original by less than1px at390px.

Original placeholders and16px typography are restored. Associated labels remain for accessibility, clipped to1×1px rather than deleted. Field names/types, autocomplete, conditional phone/email requirements, consent, honeypot and POST target are preserved. The approved privacy row remains below the message field. Existing white-plate image/media and authenticated mail configuration are unchanged.

Validation:

- Desktop111 and mobile76 real computed-transform samples under ambient reduced-motion:true show intermediate leftward motion for both5/4-image loops, with two invisible resets per carousel and no backward animation. Mid-slide viewport captures show outgoing/incoming images.
- No carousel buttons or focusable controls, pointer-events:none on both tracks, no horizontal overflow. Clicking the mobile illustration does not stop the automatic sequence.
- Original/native field heights/placeholders and photo dimensions compared at1280/390. Hidden label associations, privacy required state and both phone/email required-state branches pass. No form was submitted; no additional mail sent.
- Public307/307, TypeScript, scoped ESLint, production build/two RSC manifests and12-route SEO smoke PASS. All four source/runtime file SHA values match.

Full private evidence: D:/Core/output/kvapunaikinimas-slide-contact-20261030/ (original widget/form measurements, native geometry, motion traces, desktop/mobile contact and mid-slide screenshots). Summary: SLIDE-CONTACT-2026-10-30.json. Phone-width simulation is not a physical handset test. The read-only evaluator did not expose performance.now/DOMMatrix; evidence uses Date and actual computed transform matrices instead. Fresh1280×720 local preview retained.

No actual.lt approval/release, production/DNS/main merge, new dependency or shared form transport change. Earlier acceptance records remain historical; this note is the latest explicit owner behavior and contact-layout decision.
