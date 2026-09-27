"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const floorplan_1 = require("../src/floorplan");
const errors_1 = require("../src/errors");
const LOT = new floorplan_1.FloorPlan(1000, 1000);
(0, node_test_1.test)('accepts CW and CCW, concave, diagonal edges, redundant collinear vertices', () => {
    const fp = new floorplan_1.FloorPlan(1000, 1000);
    fp.addRoom('ccw', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
    fp.addRoom('cw', [{ x: 20, y: 20 }, { x: 20, y: 30 }, { x: 30, y: 30 }, { x: 30, y: 20 }]);
    // concave L-shape with a diagonal and redundant collinear vertices
    fp.addRoom('L', [
        { x: 40, y: 40 }, { x: 50, y: 40 }, { x: 60, y: 40 },
        { x: 60, y: 50 }, { x: 55, y: 55 }, { x: 50, y: 50 }, { x: 50, y: 60 },
        { x: 45, y: 55 }, { x: 40, y: 60 },
    ]);
    assert.equal(fp.roomCount(), 3);
});
(0, node_test_1.test)('rejects zero-area polygon', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    assert.throws(() => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }]), errors_1.InvalidPolygonError);
    assert.throws(() => fp.addRoom('b', [{ x: 0, y: 0 }, { x: 10, y: 0 }]), errors_1.InvalidPolygonError);
    assert.equal(fp.roomCount(), 0);
});
(0, node_test_1.test)('rejects zero-length edge', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    assert.throws(() => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]), errors_1.InvalidPolygonError);
});
(0, node_test_1.test)('rejects self-intersecting (bowtie) polygon', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    assert.throws(() => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }]), errors_1.InvalidPolygonError);
});
(0, node_test_1.test)('rejects spike (adjacent edge doubling back)', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    assert.throws(() => fp.addRoom('a', [
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 5 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ]), errors_1.InvalidPolygonError);
});
(0, node_test_1.test)('rejects non-adjacent edges touching at a point', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    // vertex 3 lands on edge 0->1
    assert.throws(() => fp.addRoom('a', [
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 0 }, { x: 0, y: 10 },
    ]), errors_1.InvalidPolygonError);
});
(0, node_test_1.test)('rejects non-integer or out-of-range vertices', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    assert.throws(() => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10.5, y: 0 }, { x: 0, y: 10 }]), errors_1.InvalidPolygonError);
    assert.throws(() => fp.addRoom('b', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 1000001 }]), errors_1.InvalidPolygonError);
});
(0, node_test_1.test)('property 2: outside lot rejected, on lot boundary accepted', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    assert.throws(() => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 101, y: 0 }, { x: 0, y: 10 }]), errors_1.OutOfBoundsError);
    fp.addRoom('b', [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
    assert.equal(fp.roomCount(), 1);
});
(0, node_test_1.test)('invalid lot dimensions rejected', () => {
    assert.throws(() => new floorplan_1.FloorPlan(0, 100), errors_1.OutOfBoundsError);
    assert.throws(() => new floorplan_1.FloorPlan(100, 100.5), errors_1.OutOfBoundsError);
    assert.throws(() => new floorplan_1.FloorPlan(1000001, 100), errors_1.OutOfBoundsError);
});
(0, node_test_1.test)('duplicate id, unknown id errors', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]);
    assert.throws(() => fp.addRoom('a', [{ x: 20, y: 20 }, { x: 30, y: 20 }, { x: 20, y: 30 }]), errors_1.DuplicateRoomError);
    assert.throws(() => fp.removeRoom('nope'), errors_1.RoomNotFoundError);
    assert.throws(() => fp.updateRoom('nope', [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]), errors_1.RoomNotFoundError);
    assert.throws(() => fp.exteriorSegments('nope'), errors_1.RoomNotFoundError);
});
(0, node_test_1.test)('rejected update leaves the old room intact', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
    const before = fp.exteriorSegments('a');
    assert.throws(() => fp.updateRoom('a', [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 0, y: 200 }]), errors_1.OutOfBoundsError);
    assert.deepEqual(fp.exteriorSegments('a'), before);
    fp.updateRoom('a', [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 20 }]);
    assert.equal(fp.exteriorSegments('a').length, 3);
});
(0, node_test_1.test)('removeRoom frees the space', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
    fp.removeRoom('a');
    fp.addRoom('b', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
    assert.equal(fp.roomCount(), 1);
});
