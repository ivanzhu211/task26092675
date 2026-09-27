import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { FloorPlan } from '../src/floorplan';
import { RoomOverlapError } from '../src/errors';

type P = { x: number; y: number };
const rect = (x0: number, y0: number, x1: number, y1: number): P[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

function planWith(...rooms: Array<[string, P[]]>): FloorPlan {
  const fp = new FloorPlan(1000, 1000);
  for (const [id, poly] of rooms) fp.addRoom(id, poly);
  return fp;
}

test('accept: full shared wall', () => {
  planWith(['a', rect(0, 0, 10, 10)], ['b', rect(10, 0, 20, 10)]);
});

test('accept: partial shared wall', () => {
  planWith(['a', rect(0, 0, 10, 10)], ['b', rect(10, 3, 20, 7)]);
});

test('accept: touch at a single point (corner to corner)', () => {
  planWith(['a', rect(0, 0, 10, 10)], ['b', rect(10, 10, 20, 20)]);
});

test('accept: touch at a single point (vertex to edge, T-junction)', () => {
  planWith(
    ['a', rect(0, 0, 10, 10)],
    ['b', [{ x: 10, y: 5 }, { x: 20, y: 0 }, { x: 20, y: 10 }]],
  );
});

test('accept: room nested in concave notch, sharing three walls', () => {
  const U: P[] = [
    { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 20, y: 20 },
    { x: 20, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 20 }, { x: 0, y: 20 },
  ];
  planWith(['u', U], ['notch', rect(10, 10, 20, 20)]);
});

test('accept: shared diagonal wall', () => {
  planWith(
    ['a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]],
    ['b', [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]],
  );
});

test('reject: identical polygons', () => {
  const fp = planWith(['a', rect(0, 0, 10, 10)]);
  assert.throws(() => fp.addRoom('b', rect(0, 0, 10, 10)), (e: unknown) => {
    assert.ok(e instanceof RoomOverlapError);
    assert.equal((e as RoomOverlapError).otherId, 'a');
    return true;
  });
  assert.equal(fp.roomCount(), 1);
});

test('reject: room inside another, sharing part of a wall', () => {
  const fp = planWith(['a', rect(0, 0, 30, 30)]);
  assert.throws(() => fp.addRoom('b', rect(5, 0, 15, 10)), RoomOverlapError);
});

test('reject: room strictly inside another', () => {
  const fp = planWith(['a', rect(0, 0, 30, 30)]);
  assert.throws(() => fp.addRoom('b', rect(5, 5, 15, 15)), RoomOverlapError);
});

test('reject: two rectangles crossing (plus shape)', () => {
  const fp = planWith(['a', rect(0, 5, 20, 15)]);
  assert.throws(() => fp.addRoom('b', rect(5, 0, 15, 20)), RoomOverlapError);
});

test('reject: diamond inscribed in square, touching only at vertices', () => {
  const fp = planWith(['a', rect(0, 0, 20, 20)]);
  assert.throws(
    () => fp.addRoom('b', [{ x: 10, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 20 }, { x: 0, y: 10 }]),
    RoomOverlapError,
  );
});

test('reject: edge threading through a vertex of the other room', () => {
  // b's edge (4,0)->(13,15) passes through a's vertex (10,10); no proper
  // crossing, no vertex strictly inside, yet interiors overlap.
  const fp = planWith(['a', rect(0, 0, 10, 10)]);
  assert.throws(
    () => fp.addRoom('b', [{ x: 4, y: 0 }, { x: 13, y: 15 }, { x: 15, y: 5 }, { x: 10, y: 0 }]),
    RoomOverlapError,
  );
});

test('reject: thin sliver overlap without any vertex inside', () => {
  const fp = planWith(['a', rect(0, 0, 10, 10)]);
  assert.throws(
    () => fp.addRoom('b', [{ x: 9, y: -0 }, { x: 11, y: 0 }, { x: 10, y: 20 }].map(p => ({ x: p.x, y: p.y }))),
    RoomOverlapError,
  );
});

test('reject: updateRoom causing overlap, state unchanged', () => {
  const fp = planWith(['a', rect(0, 0, 10, 10)], ['b', rect(20, 0, 30, 10)]);
  const before = fp.exteriorSegments('b');
  assert.throws(() => fp.updateRoom('b', rect(5, 0, 25, 10)), RoomOverlapError);
  assert.deepEqual(fp.exteriorSegments('b'), before);
});

test('accept: updateRoom onto its own previous footprint', () => {
  const fp = planWith(['a', rect(0, 0, 10, 10)], ['b', rect(10, 0, 20, 10)]);
  fp.updateRoom('b', rect(10, 0, 25, 10));
  assert.equal(fp.roomCount(), 2);
});
