import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { FloorPlan } from '../src/floorplan';
import {
  InvalidPolygonError, OutOfBoundsError, DuplicateRoomError, RoomNotFoundError,
} from '../src/errors';

const LOT = new FloorPlan(1000, 1000);

test('accepts CW and CCW, concave, diagonal edges, redundant collinear vertices', () => {
  const fp = new FloorPlan(1000, 1000);
  fp.addRoom('ccw', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  fp.addRoom('cw', [{ x: 20, y: 20 }, { x: 20, y: 30 }, { x: 30, y: 30 }, { x: 30, y: 20 }]);
  // concave L-shape with a diagonal and redundant collinear vertices
  fp.addRoom('L', [
    { x: 40, y: 40 }, { x: 50, y: 40 }, { x: 60, y: 40 }, // redundant vertex
    { x: 60, y: 50 }, { x: 55, y: 55 }, { x: 50, y: 50 }, { x: 50, y: 60 },
    { x: 45, y: 55 }, { x: 40, y: 60 },
  ]);
  assert.equal(fp.roomCount(), 3);
});

test('rejects zero-area polygon', () => {
  const fp = new FloorPlan(100, 100);
  assert.throws(
    () => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }]),
    InvalidPolygonError,
  );
  assert.throws(
    () => fp.addRoom('b', [{ x: 0, y: 0 }, { x: 10, y: 0 }]),
    InvalidPolygonError,
  );
  assert.equal(fp.roomCount(), 0);
});

test('rejects zero-length edge', () => {
  const fp = new FloorPlan(100, 100);
  assert.throws(
    () => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]),
    InvalidPolygonError,
  );
});

test('rejects self-intersecting (bowtie) polygon', () => {
  const fp = new FloorPlan(100, 100);
  assert.throws(
    () => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }]),
    InvalidPolygonError,
  );
});

test('rejects spike (adjacent edge doubling back)', () => {
  const fp = new FloorPlan(100, 100);
  assert.throws(
    () => fp.addRoom('a', [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 5 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ]),
    InvalidPolygonError,
  );
});

test('rejects non-adjacent edges touching at a point', () => {
  const fp = new FloorPlan(100, 100);
  // vertex 3 lands on edge 0->1
  assert.throws(
    () => fp.addRoom('a', [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 0 }, { x: 0, y: 10 },
    ]),
    InvalidPolygonError,
  );
});

test('rejects non-integer or out-of-range vertices', () => {
  const fp = new FloorPlan(100, 100);
  assert.throws(
    () => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10.5, y: 0 }, { x: 0, y: 10 }]),
    InvalidPolygonError,
  );
  assert.throws(
    () => fp.addRoom('b', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 1000001 }]),
    InvalidPolygonError,
  );
});

test('property 2: outside lot rejected, on lot boundary accepted', () => {
  const fp = new FloorPlan(100, 100);
  assert.throws(
    () => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 101, y: 0 }, { x: 0, y: 10 }]),
    OutOfBoundsError,
  );
  fp.addRoom('b', [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
  assert.equal(fp.roomCount(), 1);
});

test('invalid lot dimensions rejected', () => {
  assert.throws(() => new FloorPlan(0, 100), OutOfBoundsError);
  assert.throws(() => new FloorPlan(100, 100.5), OutOfBoundsError);
  assert.throws(() => new FloorPlan(1000001, 100), OutOfBoundsError);
});

test('duplicate id, unknown id errors', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]);
  assert.throws(
    () => fp.addRoom('a', [{ x: 20, y: 20 }, { x: 30, y: 20 }, { x: 20, y: 30 }]),
    DuplicateRoomError,
  );
  assert.throws(() => fp.removeRoom('nope'), RoomNotFoundError);
  assert.throws(
    () => fp.updateRoom('nope', [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]),
    RoomNotFoundError,
  );
  assert.throws(() => fp.exteriorSegments('nope'), RoomNotFoundError);
});

test('rejected update leaves the old room intact', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  const before = fp.exteriorSegments('a');
  assert.throws(
    () => fp.updateRoom('a', [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 0, y: 200 }]),
    OutOfBoundsError,
  );
  assert.deepEqual(fp.exteriorSegments('a'), before);
  fp.updateRoom('a', [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 20 }]);
  assert.equal(fp.exteriorSegments('a').length, 3);
});

test('removeRoom frees the space', () => {
  const fp = new FloorPlan(100, 100);
  fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  fp.removeRoom('a');
  fp.addRoom('b', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  assert.equal(fp.roomCount(), 1);
});
