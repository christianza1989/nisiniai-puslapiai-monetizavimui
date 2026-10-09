# Promedical local performance evidence

Final actual Lighthouse13.5.0 mobile run at2026-10-09T17:55:04.992Z: performance95, accessibility100, best practices100, SEO100; LCP2.6s, CLS0, TBT50ms. The report is performance/home.report.json with the original HTML. Chrome155, local production Workers transport through the read-only canonical-Host8790 proxy. The report's CPU calibration warning is retained. This is lab emulation, not field Core Web Vitals, production latency or a visual-quality score.

The original baseline is preserved in home-baseline.report.json/html: performance96, LCP2.3s, CLS0, TBT150ms. An intermediate pre-brand-label-fix run is preserved in home-before-brand-fix.report.json/html: performance93, LCP2.7s, TBT110ms. Timing variation in this local environment prevents a causal claim that the aria repair increased speed.

Responsive card sizes were corrected to the actual two-column mobile layout. Reported image-delivery waste fell from roughly261KiB to55,492bytes in the intermediate check, with the same approved source images. Small cards retain some waste because360px is the smallest immutable exported variant; the real hero image stays proportionate. No extra image-generation, animation or design restyling was added to chase a score.

The brand-link accessible-name finding was a separate unscored serious diagnostic. Removing the redundant aria-label gives the natural visible wordmark/tagline as its name. Final label-content-name-mismatch is notApplicable/score:null with no failing nodes; actual DOM/keyboard evidence confirms the name. It is not described as an audit score1.

Approved assets stay immutable. The earlier shared responsive-webp-v2 encoder effort4 change had a narrowly measured speed improvement on two actual source images with modest byte growth, documented in CORE_FEEDBACK.md; it is not a universal performance guarantee or permission to rewrite existing v1 media.
