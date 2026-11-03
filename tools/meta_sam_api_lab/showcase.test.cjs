// Pure checks for the showcase viewer core: synthetic frames only.
const assert = require('node:assert/strict');
const C = require('./showcase-core.js');

const frames = [
  { objects: [{ id: 2 }, { id: 1 }] },
  { objects: [] }, // a real frame without masks stays empty
  { objects: [{ id: 1 }] },
];
const colors = C.colorMap(frames);
assert.deepEqual(colors['1'], C.PALETTE[0], 'sorted IDs: stable colour for ID 1');
assert.deepEqual(colors['2'], C.PALETTE[1], 'ID 2 keeps its own colour');
assert.deepEqual(C.colorMap([...frames].reverse()), colors, 'frame order does not change colours');

// 10 FPS inference shown at 30 FPS: nearest earlier inferred frame, no interpolation.
assert.equal(C.frameAt(0, 10, 3), 0);
assert.equal(C.frameAt(0.099, 10, 3), 0);
assert.equal(C.frameAt(0.1, 10, 3), 1);
assert.equal(C.frameAt(99, 10, 3), 2, 'clamped to last frame');
assert.equal(C.frameAt(-1, 10, 3), 0);

const sam = C.labels({ id: 1 }, 0, 'bird', null);
assert.equal(sam.sam, 'SAM · bird #1');
assert.equal(sam.muse, null, 'no Muse label without a Muse result');
const both = C.labels({ id: 1 }, 0, 'bird', { name: 'Carpintero negro' });
assert.ok(both.muse.startsWith('Muse (candidato)'));
assert.ok(!both.sam.includes('Carpintero'), 'species never enters the SAM label');
assert.equal(both.status, 'experimental, no verificado');

assert.deepEqual(C.tracks(frames).find(t => t.id === '1'), { id: '1', first: 0, last: 2, visible: 2, gaps: 1 });
console.log('showcase core OK');
