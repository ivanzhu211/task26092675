"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowsOverlap = exports.windowTouchesBoundary = exports.windowOnBoundary = exports.validateWindowSpecs = void 0;
const geometry_1 = require("./geometry");
const errors_1 = require("./errors");
/** Basic window sanity: integer endpoints in range, positive length. */
function validateWindowSpecs(windows) {
    const segments = [];
    for (const w of windows) {
        if (!(0, geometry_1.isValidPoint)(w.a) || !(0, geometry_1.isValidPoint)(w.b)) {
            throw new errors_1.InvalidWindowError(`window endpoint (${w.a.x}, ${w.a.y})-(${w.b.x}, ${w.b.y}) is not an integer in [0, 1e6]`);
        }
        if ((0, geometry_1.pointsEqual)(w.a, w.b)) {
            throw new errors_1.InvalidWindowError(`zero-length window at (${w.a.x}, ${w.a.y})`);
        }
        segments.push({ a: w.a, b: w.b });
    }
    return segments;
}
exports.validateWindowSpecs = validateWindowSpecs;
/** Project a point onto the dominant axis of segment dir (integer result). */
function project(p, useX) {
    return useX ? p.x : p.y;
}
/**
 * True iff the window segment is fully covered by collinear boundary edges
 * (it may span redundant collinear vertices, but may not leave the boundary
 * or round a corner).
 */
function windowOnBoundary(w, edges) {
    const dx = w.b.x - w.a.x;
    const dy = w.b.y - w.a.y;
    const useX = Math.abs(dx) >= Math.abs(dy);
    const wlo = Math.min(project(w.a, useX), project(w.b, useX));
    const whi = Math.max(project(w.a, useX), project(w.b, useX));
    const intervals = [];
    for (const e of edges) {
        if ((0, geometry_1.cross)(w.a, w.b, e.a) !== 0 || (0, geometry_1.cross)(w.a, w.b, e.b) !== 0)
            continue;
        const lo = Math.max(wlo, Math.min(project(e.a, useX), project(e.b, useX)));
        const hi = Math.min(whi, Math.max(project(e.a, useX), project(e.b, useX)));
        if (hi >= lo)
            intervals.push([lo, hi]);
    }
    intervals.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    let covered = wlo;
    for (const [lo, hi] of intervals) {
        if (lo > covered)
            return false;
        if (hi > covered)
            covered = hi;
        if (covered >= whi)
            return true;
    }
    return covered >= whi;
}
exports.windowOnBoundary = windowOnBoundary;
/**
 * True iff window w shares a positive-length portion with any of the given
 * (other room's) boundary edges.
 */
function windowTouchesBoundary(w, wBox, edges, boxes) {
    for (let i = 0; i < edges.length; i++) {
        if (!(0, geometry_1.bboxesOverlap)(wBox, boxes[i]))
            continue;
        if ((0, geometry_1.segmentsCollinearOverlap)(w, edges[i]))
            return true;
    }
    return false;
}
exports.windowTouchesBoundary = windowTouchesBoundary;
/** True iff two windows of the same room overlap with positive length. */
function windowsOverlap(w1, w2) {
    return (0, geometry_1.segmentsCollinearOverlap)(w1, w2);
}
exports.windowsOverlap = windowsOverlap;
