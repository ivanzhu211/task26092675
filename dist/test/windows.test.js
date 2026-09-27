"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const floorplan_1 = require("../src/floorplan");
const errors_1 = require("../src/errors");
const rect = (x0, y0, x1, y1) => [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];
(0, node_test_1.test)('window on boundary accepted, incl. spanning redundant vertices', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', [
        { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
        { x: 10, y: 10 }, { x: 0, y: 10 },
    ], [{ a: { x: 2, y: 0 }, b: { x: 8, y: 0 } }]);
    assert.equal(fp.roomCount(), 1);
});
(0, node_test_1.test)('diagonal window on diagonal wall accepted', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], [{ a: { x: 2, y: 2 }, b: { x: 8, y: 8 } }]);
    assert.equal(fp.roomCount(), 1);
});
(0, node_test_1.test)('window not on boundary rejected', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    const poly = rect(0, 0, 10, 10);
    // extends past the corner
    assert.throws(() => fp.addRoom('a', poly, [{ a: { x: 5, y: 0 }, b: { x: 15, y: 0 } }]), errors_1.InvalidWindowError);
    // floating inside
    assert.throws(() => fp.addRoom('a', poly, [{ a: { x: 2, y: 2 }, b: { x: 8, y: 2 } }]), errors_1.InvalidWindowError);
    // parallel to the wall but offset
    assert.throws(() => fp.addRoom('a', poly, [{ a: { x: 0, y: 1 }, b: { x: 5, y: 1 } }]), errors_1.InvalidWindowError);
    assert.equal(fp.roomCount(), 0);
});
(0, node_test_1.test)('invalid window specs rejected', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    const poly = rect(0, 0, 10, 10);
    assert.throws(() => fp.addRoom('a', poly, [{ a: { x: 2, y: 0 }, b: { x: 2, y: 0 } }]), errors_1.InvalidWindowError);
    assert.throws(() => fp.addRoom('a', poly, [{ a: { x: 2.5, y: 0 }, b: { x: 4, y: 0 } }]), errors_1.InvalidWindowError);
});
(0, node_test_1.test)('windows of the same room must not overlap; point touch ok', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    const poly = rect(0, 0, 10, 10);
    assert.throws(() => fp.addRoom('a', poly, [
        { a: { x: 0, y: 0 }, b: { x: 4, y: 0 } },
        { a: { x: 3, y: 0 }, b: { x: 6, y: 0 } },
    ]), (e) => e instanceof errors_1.WindowConflictError && e.otherId === 'a');
    fp.addRoom('b', rect(20, 20, 30, 30), [
        { a: { x: 20, y: 20 }, b: { x: 24, y: 20 } },
        { a: { x: 24, y: 20 }, b: { x: 28, y: 20 } },
    ]);
    assert.equal(fp.roomCount(), 1);
});
(0, node_test_1.test)('window spanning shared/exterior junction rejected; fully exterior accepted', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', rect(0, 0, 10, 10));
    fp.addRoom('b', rect(10, 3, 20, 7)); // shares x=10, y in [3,7]
    // window crossing the junction at (10,3): portion [3,5] coincides with b
    assert.throws(() => fp.updateRoom('a', rect(0, 0, 10, 10), [{ a: { x: 10, y: 1 }, b: { x: 10, y: 5 } }]), (e) => e instanceof errors_1.WindowConflictError && e.otherId === 'b');
    // window fully on the shared wall
    assert.throws(() => fp.updateRoom('a', rect(0, 0, 10, 10), [{ a: { x: 10, y: 4 }, b: { x: 10, y: 6 } }]), errors_1.WindowConflictError);
    // window fully on the exterior part (touches the junction only at a point)
    fp.updateRoom('a', rect(0, 0, 10, 10), [{ a: { x: 10, y: 7 }, b: { x: 10, y: 9 } }]);
    assert.equal(fp.roomCount(), 2);
});
(0, node_test_1.test)('new room covering an existing window is rejected; exteriorSegments unchanged', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', rect(0, 4, 10, 10), [{ a: { x: 2, y: 4 }, b: { x: 6, y: 4 } }]);
    const before = fp.exteriorSegments('a');
    // c would share the wall y=4 and cover a's window
    assert.throws(() => fp.addRoom('c', rect(0, 0, 10, 4)), (e) => e instanceof errors_1.WindowConflictError && e.otherId === 'a');
    assert.equal(fp.roomCount(), 1);
    assert.deepEqual(fp.exteriorSegments('a'), before);
});
(0, node_test_1.test)('room without window conflict can attach below a windowed wall... not', () => {
    // Same setup but the window sits on a different wall: attachment succeeds.
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', rect(0, 4, 10, 10), [{ a: { x: 2, y: 10 }, b: { x: 6, y: 10 } }]);
    fp.addRoom('c', rect(0, 0, 10, 4));
    assert.equal(fp.roomCount(), 2);
    // a's exterior now excludes the shared wall y=4
    assert.equal(fp.exteriorSegments('a').length, 3);
});
(0, node_test_1.test)('updateRoom moving a window onto a neighbor wall rejected, state intact', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', rect(0, 0, 10, 10), [{ a: { x: 1, y: 0 }, b: { x: 3, y: 0 } }]);
    fp.addRoom('b', rect(10, 0, 20, 10));
    const before = fp.exteriorSegments('a');
    assert.throws(() => fp.updateRoom('a', rect(0, 0, 10, 10), [{ a: { x: 10, y: 2 }, b: { x: 10, y: 6 } }]), (e) => e instanceof errors_1.WindowConflictError && e.otherId === 'b');
    assert.deepEqual(fp.exteriorSegments('a'), before);
});
(0, node_test_1.test)('removing a neighbor lifts its window restrictions', () => {
    const fp = new floorplan_1.FloorPlan(100, 100);
    fp.addRoom('a', rect(0, 0, 10, 10));
    fp.addRoom('b', rect(10, 0, 20, 10));
    fp.removeRoom('b');
    fp.updateRoom('a', rect(0, 0, 10, 10), [{ a: { x: 10, y: 2 }, b: { x: 10, y: 6 } }]);
    assert.equal(fp.roomCount(), 1);
});
