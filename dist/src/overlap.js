"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polygonsInteriorOverlap = void 0;
const geometry_1 = require("./geometry");
const polygon_1 = require("./polygon");
function paramOf(num, den) {
    // den may be negative; normalize so den > 0.
    return den >= 0
        ? { num: BigInt(num), den: BigInt(den) }
        : { num: BigInt(-num), den: BigInt(-den) };
}
const PARAM_ZERO = { num: 0n, den: 1n };
const PARAM_ONE = { num: 1n, den: 1n };
function cmpParam(a, b) {
    const lhs = a.num * b.den;
    const rhs = b.num * a.den;
    return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
}
/** Parameter of integer point p on segment e (p assumed collinear with e). */
function paramOfPointOnSegment(p, e) {
    const dx = e.b.x - e.a.x;
    const dy = e.b.y - e.a.y;
    const len2 = dx * dx + dy * dy; // > 0, edges are non-degenerate
    const dot = (p.x - e.a.x) * dx + (p.y - e.a.y) * dy;
    return paramOf(dot, len2);
}
/**
 * Collect the parameters along edge e at which e meets the boundary of
 * polygon qEdges. Always includes 0 and 1.
 */
function boundaryTouchParams(e, eBox, qEdges, qBoxes) {
    const params = [PARAM_ZERO, PARAM_ONE];
    const dx = e.b.x - e.a.x;
    const dy = e.b.y - e.a.y;
    for (let i = 0; i < qEdges.length; i++) {
        if (!(0, geometry_1.bboxesOverlap)(eBox, qBoxes[i]))
            continue;
        const f = qEdges[i];
        const fx = f.b.x - f.a.x;
        const fy = f.b.y - f.a.y;
        const den = (0, geometry_1.cross2)(dx, dy, fx, fy);
        if (den !== 0) {
            if ((0, geometry_1.segmentsProperlyCross)(e, f)) {
                // t = cross2(f.a - e.a, d_f) / cross2(d_e, d_f)
                const num = (0, geometry_1.cross2)(f.a.x - e.a.x, f.a.y - e.a.y, fx, fy);
                params.push(paramOf(num, den));
            }
            else {
                // Non-collinear, non-crossing: only endpoint touches are possible.
                if ((0, geometry_1.pointOnSegment)(f.a, e))
                    params.push(paramOfPointOnSegment(f.a, e));
                if ((0, geometry_1.pointOnSegment)(f.b, e))
                    params.push(paramOfPointOnSegment(f.b, e));
                if ((0, geometry_1.pointOnSegment)(e.a, f))
                    params.push(PARAM_ZERO);
                if ((0, geometry_1.pointOnSegment)(e.b, f))
                    params.push(PARAM_ONE);
            }
        }
        else if ((0, geometry_1.cross)(e.a, e.b, f.a) === 0 && (0, geometry_1.cross)(e.a, e.b, f.b) === 0) {
            // Collinear: add the (clamped) parameters of f's endpoints on e.
            for (const p of [f.a, f.b]) {
                const t = paramOfPointOnSegment(p, e);
                if (cmpParam(t, PARAM_ZERO) < 0)
                    params.push(PARAM_ZERO);
                else if (cmpParam(t, PARAM_ONE) > 0)
                    params.push(PARAM_ONE);
                else
                    params.push(t);
            }
        }
    }
    params.sort(cmpParam);
    const unique = [];
    for (const t of params) {
        if (unique.length === 0 || cmpParam(unique[unique.length - 1], t) !== 0) {
            unique.push(t);
        }
    }
    return unique;
}
/**
 * True iff some open sub-segment of edge e (split at every touch with
 * qPoly's boundary) lies strictly inside qPoly.
 */
function edgeDipsIntoPolygon(e, eBox, qPoly, qEdges, qBoxes) {
    const params = boundaryTouchParams(e, eBox, qEdges, qBoxes);
    const dx = BigInt(e.b.x - e.a.x);
    const dy = BigInt(e.b.y - e.a.y);
    const ax = BigInt(e.a.x);
    const ay = BigInt(e.a.y);
    for (let i = 0; i + 1 < params.length; i++) {
        const t0 = params[i];
        const t1 = params[i + 1];
        // Midpoint parameter: (t0 + t1) / 2.
        const num = t0.num * t1.den + t1.num * t0.den;
        const den = 2n * t0.den * t1.den;
        const X = ax * den + num * dx;
        const Y = ay * den + num * dy;
        if ((0, geometry_1.locateRationalPointInPolygon)(X, Y, den, qPoly) === 'inside')
            return true;
    }
    return false;
}
/**
 * True iff the interiors of two simple polygons intersect. Exact.
 *
 * Handles: proper edge crossings, containment (either direction, including
 * boundary-touching containment), and same-side collinear wall overlaps.
 * Boundary-only contact (shared walls with interiors on opposite sides,
 * point touches) does not count as overlap.
 */
function polygonsInteriorOverlap(polyA, polyB) {
    const edgesA = (0, polygon_1.polygonEdges)(polyA);
    const edgesB = (0, polygon_1.polygonEdges)(polyB);
    const boxesA = edgesA.map(geometry_1.segmentBBox);
    const boxesB = edgesB.map(geometry_1.segmentBBox);
    const ccwA = (0, geometry_1.signedArea2)(polyA) > 0;
    const ccwB = (0, geometry_1.signedArea2)(polyB) > 0;
    // Same-side collinear overlap: shared wall with interiors on the same side.
    for (let i = 0; i < edgesA.length; i++) {
        const eA = edgesA[i];
        const dAx = eA.b.x - eA.a.x;
        const dAy = eA.b.y - eA.a.y;
        for (let j = 0; j < edgesB.length; j++) {
            if (!(0, geometry_1.bboxesOverlap)(boxesA[i], boxesB[j]))
                continue;
            const eB = edgesB[j];
            if ((0, geometry_1.cross)(eA.a, eA.b, eB.a) !== 0 || (0, geometry_1.cross)(eA.a, eA.b, eB.b) !== 0)
                continue;
            const dBx = eB.b.x - eB.a.x;
            const dBy = eB.b.y - eB.a.y;
            // Positive-length overlap?
            const dot = (0, geometry_1.dot2)(dAx, dAy, dBx, dBy);
            let overlap;
            if (Math.abs(dAx) >= Math.abs(dAy)) {
                const lo = Math.max(Math.min(eA.a.x, eA.b.x), Math.min(eB.a.x, eB.b.x));
                const hi = Math.min(Math.max(eA.a.x, eA.b.x), Math.max(eB.a.x, eB.b.x));
                overlap = hi > lo;
            }
            else {
                const lo = Math.max(Math.min(eA.a.y, eA.b.y), Math.min(eB.a.y, eB.b.y));
                const hi = Math.min(Math.max(eA.a.y, eA.b.y), Math.max(eB.a.y, eB.b.y));
                overlap = hi > lo;
            }
            if (!overlap)
                continue;
            // Interior of a CCW polygon lies to the left of each directed edge.
            const sameDir = dot > 0;
            const bLeftOfA = sameDir ? ccwB : !ccwB;
            if (bLeftOfA === ccwA)
                return true;
        }
    }
    // Boundary of either polygon dipping into the other's interior.
    for (let i = 0; i < edgesA.length; i++) {
        if (edgeDipsIntoPolygon(edgesA[i], boxesA[i], polyB, edgesB, boxesB))
            return true;
    }
    for (let j = 0; j < edgesB.length; j++) {
        if (edgeDipsIntoPolygon(edgesB[j], boxesB[j], polyA, edgesA, boxesA))
            return true;
    }
    return false;
}
exports.polygonsInteriorOverlap = polygonsInteriorOverlap;
