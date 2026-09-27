"use strict";
/**
 * Exact integer geometry primitives.
 *
 * All coordinates are integers in [0, 1e6]. Cross products of coordinate
 * differences are therefore bounded by ~2e12 and sums of a few of them stay
 * well below 2^53, so plain `number` arithmetic is exact here. Rational
 * quantities (edge intersection parameters) use BigInt fractions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.locateRationalPointInPolygon = exports.locatePointInPolygon = exports.segmentsCollinearOverlap = exports.segmentsIntersectAny = exports.segmentsProperlyCross = exports.bboxesOverlap = exports.polygonBBox = exports.segmentBBox = exports.pointOnSegment = exports.signedArea2 = exports.pointsEqual = exports.dot2 = exports.cross2 = exports.cross = exports.isValidPoint = exports.isValidCoord = exports.MAX_COORD = void 0;
exports.MAX_COORD = 1000000;
function isValidCoord(v) {
    return Number.isInteger(v) && v >= 0 && v <= exports.MAX_COORD;
}
exports.isValidCoord = isValidCoord;
function isValidPoint(p) {
    return isValidCoord(p.x) && isValidCoord(p.y);
}
exports.isValidPoint = isValidPoint;
/** 2D cross product of vectors (o->a) and (o->b). Exact. */
function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
exports.cross = cross;
/** Cross product of two vectors given as dx/dy pairs. Exact. */
function cross2(ux, uy, vx, vy) {
    return ux * vy - uy * vx;
}
exports.cross2 = cross2;
function dot2(ux, uy, vx, vy) {
    return ux * vx + uy * vy;
}
exports.dot2 = dot2;
function pointsEqual(p, q) {
    return p.x === q.x && p.y === q.y;
}
exports.pointsEqual = pointsEqual;
/** Twice the signed area; positive iff vertices are counter-clockwise. Exact. */
function signedArea2(poly) {
    let sum = 0;
    for (let i = 0; i < poly.length; i++) {
        const p = poly[i];
        const q = poly[(i + 1) % poly.length];
        sum += p.x * q.y - p.y * q.x;
    }
    return sum;
}
exports.signedArea2 = signedArea2;
/** True iff p lies on segment s (including endpoints). Exact. */
function pointOnSegment(p, s) {
    if (cross(s.a, s.b, p) !== 0)
        return false;
    return (Math.min(s.a.x, s.b.x) <= p.x && p.x <= Math.max(s.a.x, s.b.x) &&
        Math.min(s.a.y, s.b.y) <= p.y && p.y <= Math.max(s.a.y, s.b.y));
}
exports.pointOnSegment = pointOnSegment;
function segmentBBox(s) {
    return {
        minX: Math.min(s.a.x, s.b.x),
        minY: Math.min(s.a.y, s.b.y),
        maxX: Math.max(s.a.x, s.b.x),
        maxY: Math.max(s.a.y, s.b.y),
    };
}
exports.segmentBBox = segmentBBox;
function polygonBBox(poly) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of poly) {
        if (p.x < minX)
            minX = p.x;
        if (p.y < minY)
            minY = p.y;
        if (p.x > maxX)
            maxX = p.x;
        if (p.y > maxY)
            maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
}
exports.polygonBBox = polygonBBox;
function bboxesOverlap(b1, b2) {
    return b1.minX <= b2.maxX && b2.minX <= b1.maxX && b1.minY <= b2.maxY && b2.minY <= b1.maxY;
}
exports.bboxesOverlap = bboxesOverlap;
/**
 * True iff the two segments cross at a point interior to both
 * (a proper, non-collinear crossing). Exact.
 */
function segmentsProperlyCross(s1, s2) {
    const o1 = cross(s1.a, s1.b, s2.a);
    const o2 = cross(s1.a, s1.b, s2.b);
    const o3 = cross(s2.a, s2.b, s1.a);
    const o4 = cross(s2.a, s2.b, s1.b);
    return (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
        ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)));
}
exports.segmentsProperlyCross = segmentsProperlyCross;
/** True iff the two segments share at least one point. Exact. */
function segmentsIntersectAny(s1, s2) {
    if (segmentsProperlyCross(s1, s2))
        return true;
    if (pointOnSegment(s2.a, s1))
        return true;
    if (pointOnSegment(s2.b, s1))
        return true;
    if (pointOnSegment(s1.a, s2))
        return true;
    if (pointOnSegment(s1.b, s2))
        return true;
    return false;
}
exports.segmentsIntersectAny = segmentsIntersectAny;
/**
 * True iff the two segments are collinear and their intersection has
 * positive length. Exact.
 */
function segmentsCollinearOverlap(s1, s2) {
    if (cross(s1.a, s1.b, s2.a) !== 0 || cross(s1.a, s1.b, s2.b) !== 0)
        return false;
    // Collinear: project onto the dominant axis of s1 and compare intervals.
    const dx = s1.b.x - s1.a.x;
    const dy = s1.b.y - s1.a.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
        const lo1 = Math.min(s1.a.x, s1.b.x), hi1 = Math.max(s1.a.x, s1.b.x);
        const lo2 = Math.min(s2.a.x, s2.b.x), hi2 = Math.max(s2.a.x, s2.b.x);
        return Math.min(hi1, hi2) > Math.max(lo1, lo2);
    }
    const lo1 = Math.min(s1.a.y, s1.b.y), hi1 = Math.max(s1.a.y, s1.b.y);
    const lo2 = Math.min(s2.a.y, s2.b.y), hi2 = Math.max(s2.a.y, s2.b.y);
    return Math.min(hi1, hi2) > Math.max(lo1, lo2);
}
exports.segmentsCollinearOverlap = segmentsCollinearOverlap;
/**
 * Strict point-in-polygon for an integer point against an integer simple
 * polygon. Points exactly on the boundary report 'boundary'. Exact.
 */
function locatePointInPolygon(p, poly) {
    let inside = false;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % n];
        if (pointOnSegment(p, { a, b }))
            return 'boundary';
        const aAbove = a.y > p.y;
        const bAbove = b.y > p.y;
        if (aAbove !== bAbove) {
            // x-coordinate of the edge/ray crossing, compared against p.x.
            // sign of (p.x - xint) * (b.y - a.y):
            const s = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
            if (b.y > a.y ? s < 0 : s > 0)
                inside = !inside;
        }
    }
    return inside ? 'inside' : 'outside';
}
exports.locatePointInPolygon = locatePointInPolygon;
/**
 * Strict point-in-polygon for a rational point (X/D, Y/D), D > 0, against an
 * integer simple polygon. Exact via BigInt. Points on the boundary report
 * 'boundary'.
 */
function locateRationalPointInPolygon(X, Y, D, poly) {
    let inside = false;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % n];
        const ax = BigInt(a.x) * D, ay = BigInt(a.y) * D;
        const bx = BigInt(b.x) * D, by = BigInt(b.y) * D;
        // On-segment test: collinear and within bounding box.
        const cr = (bx - ax) * (Y - ay) - (by - ay) * (X - ax);
        if (cr === 0n) {
            const loX = ax < bx ? ax : bx, hiX = ax < bx ? bx : ax;
            const loY = ay < by ? ay : by, hiY = ay < by ? by : ay;
            if (loX <= X && X <= hiX && loY <= Y && Y <= hiY)
                return 'boundary';
        }
        const aAbove = ay > Y;
        const bAbove = by > Y;
        if (aAbove !== bAbove) {
            // sign of (p.x - xint) * (b.y - a.y), all scaled by D (>0).
            const s = (X - ax) * (by - ay) - (Y - ay) * (bx - ax);
            if (by > ay ? s < 0n : s > 0n)
                inside = !inside;
        }
    }
    return inside ? 'inside' : 'outside';
}
exports.locateRationalPointInPolygon = locateRationalPointInPolygon;
