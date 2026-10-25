# Product editor and selections

The existing catalog grant controls draft saves, publication and image uploads. Catalog read is private; public catalog receives only published product content. Drafts persist in D1 with both published-basis and draft hashes. A stale editor fails with a conflict rather than overwriting another change. Publication records the original version and actor; existing orders keep their immutable snapshot.

Content is plain text: summary, description, contents and optional SEO title/description. Images upload as bounded WebP (browser converts PNG/JPEG/WebP, preserves alpha, caps dimensions). The server checks the container and dimensions, records a store-scoped hash and stores bytes under its catalog prefix in existing private storage. Only images referenced by a currently published definition are available on the public image route. Private previews require catalog permission. No SVG/HTML or arbitrary remote fetch.

Option groups have stable identifiers, a default value and values with country-specific price deltas in minor units. A group applies only in countries where its default has a price. Values may select an image; image choices can bind a full combination, with the most specific matching image winning. Changes to identifier bindings must be reviewed before saving. No fake physical composition is generated at runtime.

A cart line is SKU plus sorted choices. Separate configurations remain separate through quote, snapshot, payment description and documents. Stock is aggregated by base SKU before order_lines insertion, so configurations do not create inventory. Quantity and all prices come from the server, not browser-supplied amounts. Physical extras need a measured complete package; the parcel planner uses configured snapshot packages while comparing SKU aggregate coverage.

Adapters must import the exact committed browser SDK; retain selection identity in local storage and recovery comparisons, and feed published catalog content into server-rendered product HTML/metadata. Draft content must never replace the editorial publication filter. Legacy orders with no choices retain their original request hashes and can replay without recalculating prices.

Validation: mixed-choice inventory/parcel/order regression; cross-store/auth/media tests; draft CAS and restart; real browser upload, preview, save, publish and responsive inspection. Tests do not authorize live charges or paid shipments.
