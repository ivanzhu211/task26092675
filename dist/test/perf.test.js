"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const floorplan_1 = require("../src/floorplan");
const CELL = 16000;
const STEP = CELL / 16;
/** 64-vertex room: each side carries 15 redundant collinear vertices. */
function roomPoly(gx, gy) {
    const x0 = gx * CELL, y0 = gy * CELL, x1 = x0 + CELL, y1 = y0 + CELL;
    const pts = [];
    for (let k = 0; k < 16; k++)
        pts.push({ x: x0 + k * STEP, y: y0 });
    for (let k = 0; k < 16; k++)
        pts.push({ x: x1, y: y0 + k * STEP });
    for (let k = 0; k < 16; k++)
        pts.push({ x: x1 - k * STEP, y: y1 });
    for (let k = 0; k < 16; k++)
        pts.push({ x: x0, y: y1 - k * STEP });
    return pts;
}
(0, node_test_1.test)('performance: 1000 tightly-tiled 64-vertex rooms added in < 5s', () => {
    const fp = new floorplan_1.FloorPlan(1000000, 1000000);
    const t0 = process.hrtime.bigint();
    let n = 0;
    outer: for (let gy = 0; gy < 62; gy++) {
        for (let gx = 0; gx < 62; gx++) {
            fp.addRoom(`r${gx}_${gy}`, roomPoly(gx, gy));
            if (++n === 1000)
                break outer;
        }
    }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    assert.equal(fp.roomCount(), 1000);
    assert.ok(ms < 5000, `adding 1000 rooms took ${ms.toFixed(0)}ms`);
    console.log(`    -> 1000 rooms added in ${ms.toFixed(0)}ms`);
});
