# Madbeauty: 19 additional approved guides

This is a separate content-only release. It admits the writer's exact package `320a8e0f50f1623cfa95e64bf2b3c16d96890cc998f587b114004d52bd581369`, source `4afef698d7ba6bdc7f9269a20855b8bf3a0a5eef`. All 39 incumbent page snapshots, dates and 180 media files are preserved; 19 approved guides and 95 responsive WebPs are added. Eleven drafts requiring actual specialist review remain outside the package.

Production runtime stays `b7a34b1703060c4d8d5e426fa29347a393c32dff`, core stays `63cfd8c2043eb2afa5eb6af638bae4dad9c86d46`, and renderer SHA stays `0c48d38915c7ab442c362d292b5250a91a33f0d604eeb0564f3bcea129d61ae0`. The full platform upgrade is neither deployed nor marked complete by this release.

Original human instructions to upload approved articles and schedule the full content plan were verified separately from the writer's handoff. [AUTHORIZATION.json](AUTHORIZATION.json) records the exact user messages; an agent's delegated request is not treated as fresh authorization.

The maintained Cloudflare builder is used with the immutable package and pinned core. The production bundle has no QA credentials or clock override, no organization staging binding, and retains `MadbeautyPlatform`, migration `v1` and the original production namespace. New scripts in this folder do not modify incumbent runtime code or the historical dates-only receipts.

Private build output and operational receipts are in ignored `cloudflare/output/next19-private`. The read-only clock QA reuses the existing isolated calendar Worker, class, namespace and credentials. Its API remains denied and it has no SMTP bindings. No private studio or draft collection enters assets.

Acceptance checks every future guide at T−1 ms and T: 51 future guides, 102 native and hosted publication states. It verifies JSON projection, SSR title/date/Article schema, sitemap/LLM discovery and image bytes. Current-time acceptance checks seven due pages and future article/media denial. Canonical before-release verification checks the 284 incumbent paths; after-release verification checks all 379 paths, including 95 newly staged future images.

`provider.mjs` reconciles the actual incumbent `4dbdf361-25c6-4496-97a5-daaed23df201` before deployment and compares migrations, compatibility, namespace/class, plain variables, secret names, domain assignments and observability after deployment. `deploy.mjs` requires fresh exact-package native/hosted/live-before receipts and repeats the provider baseline check immediately before upload.

After deployment, record the actual version and canonical/native browser results in `RECEIPT.json`. Until that receipt exists, this folder describes a prepared release, not a completed production deployment. If canonical acceptance fails, restore the prior version with the provider's rollback command; do not change DNS, mail credentials or data namespaces as a workaround.
