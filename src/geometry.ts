/**
 * Exact integer geometry primitives.
 *
 * All coordinates are integers in [0, 1e6]. Cross products of coordinate
 * differences are therefore bounded by ~2e12 and sums of a few of them stay
 * well below 2^53, so plain `number` arithmetic is exact here. Rational
 * quantities (edge intersection parameters) use BigInt fractions.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Segment {
  readonly a: Point;
  readonly b: Point;
}

export const MAX_COORD = 1_000_000;

export function isValidCoord(v: number): boolean {
  return Number.isInteger(v) && v >= 0 && v <= MAX_COORD;
}

export function isValidPoint(p: Point): boolean {
  return isValidCoord(p.x) && isValidCoord(p.y);
}

/** 2D cross product of vectors (o->a) and (o->b). Exact. */
export function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Cross product of two vectors given as dx/dy pairs. Exact. */
export function cross2(ux: number, uy: number, vx: number, vy: number): number {
  return ux * vy - uy * vx;
}

export function dot2(ux: number, uy: number, vx: number, vy: number): number {
  return ux * vx + uy * vy;
}

export function pointsEqual(p: Point, q: Point): boolean {
  return p.x === q.x && p.y === q.y;
}

/** Twice the signed area; positive iff vertices are counter-clockwise. Exact. */
export function signedArea2(poly: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    sum += p.x * q.y - p.y * q.x;
  }
  return sum;
}

/** True iff p lies on segment s (including endpoints). Exact. */
export function pointOnSegment(p: Point, s: Segment): boolean {
  if (cross(s.a, s.b, p) !== 0) return false;
  return (
    Math.min(s.a.x, s.b.x) <= p.x && p.x <= Math.max(s.a.x, s.b.x) &&
    Math.min(s.a.y, s.b.y) <= p.y && p.y <= Math.max(s.a.y, s.b.y)
  );
}

export interface BBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export function segmentBBox(s: Segment): BBox {
  return {
    minX: Math.min(s.a.x, s.b.x),
    minY: Math.min(s.a.y, s.b.y),
    maxX: Math.max(s.a.x, s.b.x),
    maxY: Math.max(s.a.y, s.b.y),
  };
}

export function polygonBBox(poly: readonly Point[]): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function bboxesOverlap(b1: BBox, b2: BBox): boolean {
  return b1.minX <= b2.maxX && b2.minX <= b1.maxX && b1.minY <= b2.maxY && b2.minY <= b1.maxY;
}

/**
 * True iff the two segments cross at a point interior to both
 * (a proper, non-collinear crossing). Exact.
 */
export function segmentsProperlyCross(s1: Segment, s2: Segment): boolean {
  const o1 = cross(s1.a, s1.b, s2.a);
  const o2 = cross(s1.a, s1.b, s2.b);
  const o3 = cross(s2.a, s2.b, s1.a);
  const o4 = cross(s2.a, s2.b, s1.b);
  return (
    ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
    ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
  );
}

/** True iff the two segments share at least one point. Exact. */
export function segmentsIntersectAny(s1: Segment, s2: Segment): boolean {
  if (segmentsProperlyCross(s1, s2)) return true;
  if (pointOnSegment(s2.a, s1)) return true;
  if (pointOnSegment(s2.b, s1)) return true;
  if (pointOnSegment(s1.a, s2)) return true;
  if (pointOnSegment(s1.b, s2)) return true;
  return false;
}

/**
 * True iff the two segments are collinear and their intersection has
 * positive length. Exact.
 */
export function segmentsCollinearOverlap(s1: Segment, s2: Segment): boolean {
  if (cross(s1.a, s1.b, s2.a) !== 0 || cross(s1.a, s1.b, s2.b) !== 0) return false;
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

export type PointLocation = 'inside' | 'outside' | 'boundary';

/**
 * Strict point-in-polygon for an integer point against an integer simple
 * polygon. Points exactly on the boundary report 'boundary'. Exact.
 */
export function locatePointInPolygon(p: Point, poly: readonly Point[]): PointLocation {
  let inside = false;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    if (pointOnSegment(p, { a, b })) return 'boundary';
    const aAbove = a.y > p.y;
    const bAbove = b.y > p.y;
    if (aAbove !== bAbove) {
      // x-coordinate of the edge/ray crossing, compared against p.x.
      // sign of (p.x - xint) * (b.y - a.y):
      const s = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
      if (b.y > a.y ? s < 0 : s > 0) inside = !inside;
    }
  }
  return inside ? 'inside' : 'outside';
}

/**
 * Strict point-in-polygon for a rational point (X/D, Y/D), D > 0, against an
 * integer simple polygon. Exact via BigInt. Points on the boundary report
 * 'boundary'.
 */
export function locateRationalPointInPolygon(
  X: bigint, Y: bigint, D: bigint, poly: readonly Point[],
): PointLocation {
  let inside = false;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const ax = BigInt(a.x) * D, ay = BigInt(a.y) * D;
    const bx = BigInt(b.x) * D, by = BigInt(b.y) * D;
    // On-segment test: collinear and within bounding box.
    const cr = (bx - ax) * (Y - ay) - (by - ay) * (X - ax);
    if (cr === 0n) {
      const loX = ax < bx ? ax : bx, hiX = ax < bx ? bx : ax;
      const loY = ay < by ? ay : by, hiY = ay < by ? by : ay;
      if (loX <= X && X <= hiX && loY <= Y && Y <= hiY) return 'boundary';
    }
    const aAbove = ay > Y;
    const bAbove = by > Y;
    if (aAbove !== bAbove) {
      // sign of (p.x - xint) * (b.y - a.y), all scaled by D (>0).
      const s = (X - ax) * (by - ay) - (Y - ay) * (bx - ax);
      if (by > ay ? s < 0n : s > 0n) inside = !inside;
    }
  }
  return inside ? 'inside' : 'outside';
}
