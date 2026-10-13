# Madbeauty search correction

The existing service datalist filtered suggestions by the selected label, leaving only that service visible. The shared search form now uses a native select with all 10 taxonomy choices. Search, provider creation, profile revision, backend validation and local/Workers routes now use one 103-city Lithuanian registry.

Deployed on https://madbeauty.lt as version `402a0fb5-bd02-4a78-8a3b-de083aeb68e8`; prior version `277e5fb7-51f0-44b1-bc1b-96bd7ca42a8a`. No data migration or secret/binding changes. Code rollback uses the prior version and preserves current data.

Validation: 83 automated tests passed after restoring the isolated checkout dependencies/content sandbox. Browser submitted every service and ten previously missing cities. Homepage selection led to the correct search filters. Canonical verification passed 17 public pages, 120 assets, seven missing/private boundaries and three discovery routes.

Default desktop viewport verified. The requested 390px IAB override remained at 1280px, so mobile coverage is unverified. Screenshots and raw test logs stay local. This source patch depends on the existing Cloudflare release branch/PR8; main merge is separate from deployed status.
