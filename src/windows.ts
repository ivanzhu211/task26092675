import {
  Point, Segment, BBox, cross, isValidPoint, pointsEqual,
  segmentBBox, bboxesOverlap, segmentsCollinearOverlap,
} from './geometry';
import { InvalidWindowError } from './errors';

export interface WindowSpec {
  readonly a: Point;
  readonly b: Point;
}

/** Basic window sanity: integer endpoints in range, positive length. */
export function validateWindowSpecs(windows: readonly WindowSpec[]): Segment[] {
  const segments: Segment[] = [];
  for (const w of windows) {
    if (!isValidPoint(w.a) || !isValidPoint(w.b)) {
      throw new InvalidWindowError(
        `window endpoint (${w.a.x}, ${w.a.y})-(${w.b.x}, ${w.b.y}) is not an integer in [0, 1e6]`,
      );
    }
    if (pointsEqual(w.a, w.b)) {
      throw new InvalidWindowError(`zero-length window at (${w.a.x}, ${w.a.y})`);
    }
    segments.push({ a: w.a, b: w.b });
  }
  return segments;
}

/** Project a point onto the dominant axis of segment dir (integer result). */
function project(p: Point, useX: boolean): number {
  return useX ? p.x : p.y;
}

/**
 * True iff the window segment is fully covered by collinear boundary edges
 * (it may span redundant collinear vertices, but may not leave the boundary
 * or round a corner).
 */
export function windowOnBoundary(w: Segment, edges: readonly Segment[]): boolean {
  const dx = w.b.x - w.a.x;
  const dy = w.b.y - w.a.y;
  const useX = Math.abs(dx) >= Math.abs(dy);
  const wlo = Math.min(project(w.a, useX), project(w.b, useX));
  const whi = Math.max(project(w.a, useX), project(w.b, useX));
  const intervals: Array<[number, number]> = [];
  for (const e of edges) {
    if (cross(w.a, w.b, e.a) !== 0 || cross(w.a, w.b, e.b) !== 0) continue;
    const lo = Math.max(wlo, Math.min(project(e.a, useX), project(e.b, useX)));
    const hi = Math.min(whi, Math.max(project(e.a, useX), project(e.b, useX)));
    if (hi >= lo) intervals.push([lo, hi]);
  }
  intervals.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  let covered = wlo;
  for (const [lo, hi] of intervals) {
    if (lo > covered) return false;
    if (hi > covered) covered = hi;
    if (covered >= whi) return true;
  }
  return covered >= whi;
}

/**
 * True iff window w shares a positive-length portion with any of the given
 * (other room's) boundary edges.
 */
export function windowTouchesBoundary(
  w: Segment, wBox: BBox, edges: readonly Segment[], boxes: readonly BBox[],
): boolean {
  for (let i = 0; i < edges.length; i++) {
    if (!bboxesOverlap(wBox, boxes[i]!)) continue;
    if (segmentsCollinearOverlap(w, edges[i]!)) return true;
  }
  return false;
}

/** True iff two windows of the same room overlap with positive length. */
export function windowsOverlap(w1: Segment, w2: Segment): boolean {
  return segmentsCollinearOverlap(w1, w2);
}

