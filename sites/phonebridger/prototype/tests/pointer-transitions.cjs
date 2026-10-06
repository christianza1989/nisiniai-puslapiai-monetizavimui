const test = require('node:test');
const assert = require('node:assert/strict');
const { transitionPointer, cursorFragments } = require('../simulation.js');

const regions = {
  pc: { left:300, right:900, top:200, bottom:530 },
  left: { left:130, right:270, top:190, bottom:500 },
  right: { left:930, right:1070, top:190, bottom:500 },
  top: { left:450, right:750, top:30, bottom:165 },
};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

for (const [phone, point, dx, dy] of [
  ['left', {x:300.75,y:210}, -.25, 0],
  ['right', {x:899.25,y:490}, .25, 0],
  ['top', {x:455,y:200.75}, 0, -.25],
]) {
  test(`quarter-pixel movement crosses into ${phone} without sticking`, () => {
    let state = { point, active:'pc' };
    for (let i = 0; i < 4; i++) state = transitionPointer(state.point, state.active, dx, dy, regions);
    assert.equal(state.active, phone);
    if (phone === 'top') { close(state.point.x, point.x); close(state.point.y, 164.75); }
    else { close(state.point.y, point.y); close(state.point.x, phone === 'left' ? 269.75 : 930.25); }
    state = transitionPointer(state.point, state.active, -dx * 2, -dy * 2, regions);
    assert.equal(state.active, 'pc');
    close(state.point.x, point.x + dx * 2);
    close(state.point.y, point.y + dy * 2);
  });
}

for (const [phone, point, dx, dy] of [
  ['left', {x:300.75,y:250}, -2.5, .4],
  ['right', {x:899.25,y:250}, 2.5, .4],
  ['top', {x:740,y:200.75}, .4, -2.5],
]) {
  test(`${phone} transition conserves overshoot and alignment in both directions`, () => {
    const entered = transitionPointer(point, 'pc', dx, dy, regions);
    assert.equal(entered.active, phone);
    const returned = transitionPointer(entered.point, entered.active, -dx, -dy, regions);
    assert.equal(returned.active, 'pc');
    close(returned.point.x, point.x); close(returned.point.y, point.y);
  });
}

test('side transitions match the phone height instead of a fixed middle percentage', () => {
  for (const y of [201, 499]) {
    assert.equal(transitionPointer({x:301,y}, 'pc', -2, 0, regions).active, 'left');
    assert.equal(transitionPointer({x:899,y}, 'pc', 2, 0, regions).active, 'right');
  }
  const below = transitionPointer({x:301,y:515}, 'pc', -2, 0, regions);
  assert.equal(below.active, 'pc'); close(below.point.x, 300);
});

test('vertical movement along an entry edge does not bounce between devices', () => {
  const state = transitionPointer({x:270,y:300}, 'left', 0, 1, regions);
  assert.equal(state.active, 'left'); close(state.point.y, 301);
});

const visible = (position, start, end, size) => Math.max(0, Math.min(end, position + size) - Math.max(start, position));
for (const [phone, point, dx, dy, axis, size] of [
  ['left',{x:302,y:300},-.25,0,'x',12],
  ['right',{x:898,y:300},.25,0,'x',12],
  ['top',{x:600,y:202},0,-.25,'y',16],
]) {
  test(`cursor fragments cross ${phone} and return continuously instead of appearing whole`, () => {
    let state = {point,active:'pc'};
    const fragmentSizes = state => {
      const positions = {...cursorFragments(state.point,state.active,regions),[state.active]:state.point};
      return Object.fromEntries(['pc',phone].map(key => {
        const start = axis === 'x' ? regions[key].left : regions[key].top;
        const end = axis === 'x' ? regions[key].right : regions[key].bottom;
        return [key,positions[key] ? visible(positions[key][axis],start,end,size) : 0];
      }));
    };
    for (const direction of [1,-1]) {
      let before = fragmentSizes(state);
      for (let n=0;n<64;n++) {
        state = transitionPointer(state.point,state.active,dx*direction,dy*direction,regions);
        const after = fragmentSizes(state);
        close(after.pc + after[phone],size);
        assert.ok(Math.abs(after.pc-before.pc) <= .250000001);
        assert.ok(Math.abs(after[phone]-before[phone]) <= .250000001);
        before = after;
      }
    }
    assert.equal(state.active,'pc'); close(state.point.x,point.x); close(state.point.y,point.y);
  });
}

test('fragments are confined to connected edges and do not peek through blocked frame areas', () => {
  assert.deepEqual(cursorFragments({x:899,y:515},'pc',regions),{});
  assert.equal(cursorFragments({x:440,y:200},'pc',regions).top,undefined);
  assert.deepEqual(cursorFragments({x:200,y:185},'left',regions),{});
  assert.deepEqual(cursorFragments({x:600,y:300},'top',regions),{});
});
