"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referenceInteriorOverlap = void 0;
/**
 * Brute-force reference implementation of interior-overlap, written directly
 * from the specification with no spatial pruning and no shared machinery
 * from src/overlap.ts. Used as the oracle for randomized comparison.
 */
const geometry_1 = require("../src/geometry");
function edges(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
        out.push({ a: poly[i], b: poly[(i + 1) % poly.length] });
    }
    return out;
}
function rat(num, den) {
    return den >= 0
        ? { num: BigInt(num), den: BigInt(den) }
        : { num: BigInt(-num), den: BigInt(-den) };
}
function cmpRat(a, b) {
    const l = a.num * b.den;
    const r = b.num * a.den;
    return l < r ? -1 : l > r ? 1 : 0;
}
/** All parameters along e where e meets any edge of other (0 and 1 included). */
function touchParams(e, other) {
    const out = [{ num: 0n, den: 1n }, { num: 1n, den: 1n }];
    const dx = e.b.x - e.a.x;
    const dy = e.b.y - e.a.y;
    const len2 = dx * dx + dy * dy;
    const paramOfPoint = (p) => rat((p.x - e.a.x) * dx + (p.y - e.a.y) * dy, len2);
    for (const f of other) {
        const fx = f.b.x - f.a.x;
        const fy = f.b.y - f.a.y;
        const den = (0, geometry_1.cross2)(dx, dy, fx, fy);
        if (den !== 0) {
            if ((0, geometry_1.segmentsProperlyCross)(e, f)) {
                out.push(rat((0, geometry_1.cross2)(f.a.x - e.a.x, f.a.y - e.a.y, fx, fy), den));
            }
            else {
                if ((0, geometry_1.pointOnSegment)(f.a, e))
                    out.push(paramOfPoint(f.a));
                if ((0, geometry_1.pointOnSegment)(f.b, e))
                    out.push(paramOfPoint(f.b));
                if ((0, geometry_1.pointOnSegment)(e.a, f))
                    out.push({ num: 0n, den: 1n });
                if ((0, geometry_1.pointOnSegment)(e.b, f))
                    out.push({ num: 1n, den: 1n });
            }
        }
        else if ((0, geometry_1.cross)(e.a, e.b, f.a) === 0 && (0, geometry_1.cross)(e.a, e.b, f.b) === 0) {
            for (const p of [f.a, f.b]) {
                const t = paramOfPoint(p);
                if (cmpRat(t, { num: 0n, den: 1n }) < 0)
                    out.push({ num: 0n, den: 1n });
                else if (cmpRat(t, { num: 1n, den: 1n }) > 0)
                    out.push({ num: 1n, den: 1n });
                else
                    out.push(t);
            }
        }
    }
    out.sort(cmpRat);
    return out;
}
/** True iff some open piece of e lies strictly inside poly. */
function edgeEnters(e, poly, polyEdges) {
    const ts = touchParams(e, polyEdges);
    const dx = BigInt(e.b.x - e.a.x);
    const dy = BigInt(e.b.y - e.a.y);
    const ax = BigInt(e.a.x);
    const ay = BigInt(e.a.y);
    for (let i = 0; i + 1 < ts.length; i++) {
        const t0 = ts[i];
        const t1 = ts[i + 1];
        if (cmpRat(t0, t1) === 0)
            continue;
        const num = t0.num * t1.den + t1.num * t0.den;
        const den = 2n * t0.den * t1.den;
        const X = ax * den + num * dx;
        const Y = ay * den + num * dy;
        if ((0, geometry_1.locateRationalPointInPolygon)(X, Y, den, poly) === 'inside')
            return true;
    }
    return false;
}
/** True iff the interiors of two simple polygons intersect. */
function referenceInteriorOverlap(A, B) {
    const ea = edges(A);
    const eb = edges(B);
    const ccwA = (0, geometry_1.signedArea2)(A) > 0;
    const ccwB = (0, geometry_1.signedArea2)(B) > 0;
    // Shared collinear wall pieces with interiors on the same side.
    for (const a of ea) {
        for (const b of eb) {
            if ((0, geometry_1.cross)(a.a, a.b, b.a) !== 0 || (0, geometry_1.cross)(a.a, a.b, b.b) !== 0)
                continue;
            const dax = a.b.x - a.a.x, day = a.b.y - a.a.y;
            const dbx = b.b.x - b.a.x, dby = b.b.y - b.a.y;
            const dot = (0, geometry_1.dot2)(dax, day, dbx, dby);
            const useX = Math.abs(dax) >= Math.abs(day);
            const lo = Math.max(useX ? Math.min(a.a.x, a.b.x) : Math.min(a.a.y, a.b.y), useX ? Math.min(b.a.x, b.b.x) : Math.min(b.a.y, b.b.y));
            const hi = Math.min(useX ? Math.max(a.a.x, a.b.x) : Math.max(a.a.y, a.b.y), useX ? Math.max(b.a.x, b.b.x) : Math.max(b.a.y, b.b.y));
            if (hi <= lo)
                continue;
            const bLeftOfA = dot > 0 ? ccwB : !ccwB;
            if (bLeftOfA === ccwA)
                return true;
        }
    }
    for (const e of ea)
        if (edgeEnters(e, B, eb))
            return true;
    for (const e of eb)
        if (edgeEnters(e, A, ea))
            return true;
    return false;
}
exports.referenceInteriorOverlap = referenceInteriorOverlap;
