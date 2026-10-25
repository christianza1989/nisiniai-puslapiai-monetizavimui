// Homepage-only illustrative choices. No product configuration, URL, or storage state.
export const demoColors = ['VL0034', 'VL1048', 'VL5001', 'VL3067', 'VL4041'];
export const demoArmrests = ['2D', '3D', '4D'];
export function createDemoState() {
  return Object.freeze({color: demoColors[0], armrests: '4D', headrest: true});
}
export function changeDemoState(state, field, value) {
  const valid = field === 'color' ? demoColors.includes(value)
    : field === 'armrests' ? demoArmrests.includes(value)
    : field === 'headrest' && typeof value === 'boolean';
  if (!valid) throw new Error('Unknown demonstration choice');
  return Object.freeze({...state, [field]: value});
}
export function demoAssemblyKey(state) {
  return `${state.armrests}|${state.headrest ? 'with' : 'without'}`;
}
export function demoFinishCode(state, field) {
  if (['CUPHSEATCOLOR', 'CUPHBACKRESTCOLOR', 'CHEADRESTUPHCHCOLOR'].includes(field)) return state.color;
  if (['CSEBASIDEPROFILUPHCOLOR', 'CHEADSIDEPROFUPHCHCOL'].includes(field)) return 'VL4041';
}
