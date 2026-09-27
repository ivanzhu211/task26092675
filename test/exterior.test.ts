import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { FloorPlan } from '../src/floorplan';
import { Segment } from '../src/geometry';

type P = { x: number; y: number };
const rect = (x0: number, y0: number, x1: number, y1: number): P[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

/** Canonicalize segments for order-insensitive comparison. */
function canon(segs: Segment[]): string[] {
  return segs.map((s) => {
    const fwd = `${s.a.x},${s.a.y}-${s.b.x},${s.b.y}`;
    const bwd = `${s.b.x},${s.b.y}-${s.a.x},${s.a.y}`;
    return fwd < bwd ? fwd : bwd;
  }).sort();
}

test('standalone room: full boundary, redundant vertices merged', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', [
    { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 10 }, { x: 0, y: 10 },
  ]);
  assert.deepEqual(canon(fp.exteriorSegments('a')), canon([
    { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
    { a: { x: 10, y: 0 }, b: { x: 10, y: 10 } },
    { a: { x: 10, y: 10 }, b: { x: 0, y: 10 } },
    { a: { x: 0, y: 10 }, b: { x: 0, y: 0 } },
  ]));
});

test('full shared wall excluded', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', rect(0, 0, 10, 10));
  fp.addRoom('b', rect(10, 0, 20, 10));
  assert.deepEqual(canon(fp.exteriorSegments('a')), canon([
    { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
    { a: { x: 10, y: 10 }, b: { x: 0, y: 10 } },
    { a: { x: 0, y: 10 }, b: { x: 0, y: 0 } },
  ]));
});

test('partial shared wall splits the edge', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', rect(0, 0, 10, 10));
  fp.addRoom('b', rect(10, 3, 20, 7));
  assert.deepEqual(canon(fp.exteriorSegments('a')), canon([
    { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
    { a: { x: 10, y: 0 }, b: { x: 10, y: 3 } },
    { a: { x: 10, y: 7 }, b: { x: 10, y: 10 } },
    { a: { x: 10, y: 10 }, b: { x: 0, y: 10 } },
    { a: { x: 0, y: 10 }, b: { x: 0, y: 0 } },
  ]));
  // b's left wall is fully shared
  assert.deepEqual(canon(fp.exteriorSegments('b')), canon([
    { a: { x: 10, y: 3 }, b: { x: 20, y: 3 } },
    { a: { x: 20, y: 3 }, b: { x: 20, y: 7 } },
    { a: { x: 20, y: 7 }, b: { x: 10, y: 7 } },
  ]));
});

test('notch room: three shared walls excluded from both sides', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('u', [
    { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 20, y: 20 },
    { x: 20, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 20 }, { x: 0, y: 20 },
  ]);
  fp.addRoom('n', rect(10, 10, 20, 20));
  // notch room: only its top wall y=20 is exterior
  assert.deepEqual(canon(fp.exteriorSegments('n')), canon([
    { a: { x: 10, y: 20 }, b: { x: 20, y: 20 } },
  ]));
  // u: outer rectangle minus nothing, plus nothing of the notch walls
  assert.deepEqual(canon(fp.exteriorSegments('u')), canon([
    { a: { x: 0, y: 0 }, b: { x: 30, y: 0 } },
    { a: { x: 30, y: 0 }, b: { x: 30, y: 20 } },
    { a: { x: 30, y: 20 }, b: { x: 20, y: 20 } },
    { a: { x: 10, y: 20 }, b: { x: 0, y: 20 } },
    { a: { x: 0, y: 20 }, b: { x: 0, y: 0 } },
  ]));
});

test('diagonal shared wall excluded', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
  fp.addRoom('b', [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  assert.deepEqual(canon(fp.exteriorSegments('a')), canon([
    { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
    { a: { x: 10, y: 0 }, b: { x: 10, y: 10 } },
  ]));
});

test('wrap-around merge across the first vertex', () => {
  const fp = new FloorPlan(100, 100);
  // vertex list starts mid-wall: bottom wall split across the wrap
  fp.addRoom('a', [
    { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
  ]);
  const segs = fp.exteriorSegments('a');
  assert.equal(segs.length, 4);
  assert.deepEqual(canon(segs), canon([
    { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
    { a: { x: 10, y: 0 }, b: { x: 10, y: 10 } },
    { a: { x: 10, y: 10 }, b: { x: 0, y: 10 } },
    { a: { x: 0, y: 10 }, b: { x: 0, y: 0 } },
  ]));
});

test('fully enclosed boundary yields no exterior segments', () => {
  const fp = new FloorPlan(100, 100);
  // 'core' is surrounded on all four sides by neighbors sharing each wall
  fp.addRoom('core', rect(10, 10, 20, 20));
  fp.addRoom('left', rect(0, 10, 10, 20));
  fp.addRoom('right', rect(20, 10, 30, 20));
  fp.addRoom('below', rect(10, 0, 20, 10));
  fp.addRoom('above', rect(10, 20, 20, 30));
  assert.deepEqual(fp.exteriorSegments('core'), []);
});

test('removing a neighbor restores the shared wall as exterior', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', rect(0, 0, 10, 10));
  fp.addRoom('b', rect(10, 0, 20, 10));
  assert.equal(fp.exteriorSegments('a').length, 3);
  fp.removeRoom('b');
  assert.equal(fp.exteriorSegments('a').length, 4);
});

test('updateRoom recomputes exterior segments', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', rect(0, 0, 10, 10));
  fp.addRoom('b', rect(10, 0, 20, 10));
  fp.updateRoom('b', rect(10, 0, 20, 5));
  assert.deepEqual(canon(fp.exteriorSegments('a')), canon([
    { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
    { a: { x: 10, y: 5 }, b: { x: 10, y: 10 } },
    { a: { x: 10, y: 10 }, b: { x: 0, y: 10 } },
    { a: { x: 0, y: 10 }, b: { x: 0, y: 0 } },
  ]));
});
