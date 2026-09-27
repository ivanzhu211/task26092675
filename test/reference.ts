/**
 * Brute-force reference implementation of interior-overlap, written directly
 * from the specification with no spatial pruning and no shared machinery
 * from src/overlap.ts. Used as the oracle for randomized comparison.
 */
import {
  Point, Segment, cross, cross2, dot2, signedArea2,
  segmentsProperlyCross, pointOnSegment, locateRationalPointInPolygon,
} from '../src/geometry';

function edges(poly: readonly Point[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < poly.length; i++) {
    out.push({ a: poly[i]!, b: poly[(i + 1) % poly.length]! });
  }
  return out;
}

interface Rat { num: bigint; den: bigint } // den > 0

function rat(num: number, den: number): Rat {
  return den >= 0
    ? { num: BigInt(num), den: BigInt(den) }
    : { num: BigInt(-num), den: BigInt(-den) };
}

function cmpRat(a: Rat, b: Rat): number {
  const l = a.num * b.den;
  const r = b.num * a.den;
  return l < r ? -1 : l > r ? 1 : 0;
}

/** All parameters along e where e meets any edge of other (0 and 1 included). */
function touchParams(e: Segment, other: readonly Segment[]): Rat[] {
  const out: Rat[] = [{ num: 0n, den: 1n }, { num: 1n, den: 1n }];
  const dx = e.b.x - e.a.x;
  const dy = e.b.y - e.a.y;
  const len2 = dx * dx + dy * dy;
  const paramOfPoint = (p: Point): Rat =>
    rat((p.x - e.a.x) * dx + (p.y - e.a.y) * dy, len2);
  for (const f of other) {
    const fx = f.b.x - f.a.x;
    const fy = f.b.y - f.a.y;
    const den = cross2(dx, dy, fx, fy);
    if (den !== 0) {
      if (segmentsProperlyCross(e, f)) {
        out.push(rat(cross2(f.a.x - e.a.x, f.a.y - e.a.y, fx, fy), den));
      } else {
        if (pointOnSegment(f.a, e)) out.push(paramOfPoint(f.a));
        if (pointOnSegment(f.b, e)) out.push(paramOfPoint(f.b));
        if (pointOnSegment(e.a, f)) out.push({ num: 0n, den: 1n });
        if (pointOnSegment(e.b, f)) out.push({ num: 1n, den: 1n });
      }
    } else if (cross(e.a, e.b, f.a) === 0 && cross(e.a, e.b, f.b) === 0) {
      for (const p of [f.a, f.b]) {
        const t = paramOfPoint(p);
        if (cmpRat(t, { num: 0n, den: 1n }) < 0) out.push({ num: 0n, den: 1n });
        else if (cmpRat(t, { num: 1n, den: 1n }) > 0) out.push({ num: 1n, den: 1n });
        else out.push(t);
      }
    }
  }
  out.sort(cmpRat);
  return out;
}

/** True iff some open piece of e lies strictly inside poly. */
function edgeEnters(e: Segment, poly: readonly Point[], polyEdges: readonly Segment[]): boolean {
  const ts = touchParams(e, polyEdges);
  const dx = BigInt(e.b.x - e.a.x);
  const dy = BigInt(e.b.y - e.a.y);
  const ax = BigInt(e.a.x);
  const ay = BigInt(e.a.y);
  for (let i = 0; i + 1 < ts.length; i++) {
    const t0 = ts[i]!;
    const t1 = ts[i + 1]!;
    if (cmpRat(t0, t1) === 0) continue;
    const num = t0.num * t1.den + t1.num * t0.den;
    const den = 2n * t0.den * t1.den;
    const X = ax * den + num * dx;
    const Y = ay * den + num * dy;
    if (locateRationalPointInPolygon(X, Y, den, poly) === 'inside') return true;
  }
  return false;
}

/** True iff the interiors of two simple polygons intersect. */
export function referenceInteriorOverlap(A: readonly Point[], B: readonly Point[]): boolean {
  const ea = edges(A);
  const eb = edges(B);
  const ccwA = signedArea2(A) > 0;
  const ccwB = signedArea2(B) > 0;

  // Shared collinear wall pieces with interiors on the same side.
  for (const a of ea) {
    for (const b of eb) {
      if (cross(a.a, a.b, b.a) !== 0 || cross(a.a, a.b, b.b) !== 0) continue;
      const dax = a.b.x - a.a.x, day = a.b.y - a.a.y;
      const dbx = b.b.x - b.a.x, dby = b.b.y - b.a.y;
      const dot = dot2(dax, day, dbx, dby);
      const useX = Math.abs(dax) >= Math.abs(day);
      const lo = Math.max(
        useX ? Math.min(a.a.x, a.b.x) : Math.min(a.a.y, a.b.y),
        useX ? Math.min(b.a.x, b.b.x) : Math.min(b.a.y, b.b.y),
      );
      const hi = Math.min(
        useX ? Math.max(a.a.x, a.b.x) : Math.max(a.a.y, a.b.y),
        useX ? Math.max(b.a.x, b.b.x) : Math.max(b.a.y, b.b.y),
      );
      if (hi <= lo) continue;
      const bLeftOfA = dot > 0 ? ccwB : !ccwB;
      if (bLeftOfA === ccwA) return true;
    }
  }

  for (const e of ea) if (edgeEnters(e, B, eb)) return true;
  for (const e of eb) if (edgeEnters(e, A, ea)) return true;
  return false;
}
