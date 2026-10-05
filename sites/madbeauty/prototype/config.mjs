// The only demo configuration authority. Never inferred from a query string.
export const DEMO_CONFIG = Object.freeze({enabled:false,seedVersion:'madbeauty-v1',timezone:'Europe/Vilnius',defaultScenario:'happy'});
export const SCENARIOS = Object.freeze(['happy','empty','no-calendar','stale','no-slots','conflict','expired-hold','delivery-error','pending-profile','permission-denied']);
export function resolveMode({enabled=DEMO_CONFIG.enabled,deployment='production',realAdapter=null}={}) {
  if (enabled && deployment==='production') throw Error('Demo forbidden in production');
  if (enabled) return 'demo';
  return realAdapter ? 'real' : 'off';
}
