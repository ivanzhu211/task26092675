import {
  Point, Segment, cross2, dot2, isValidPoint, pointsEqual,
  segmentBBox, bboxesOverlap, segmentsIntersectAny, signedArea2,
} from './geometry';
import { InvalidPolygonError, OutOfBoundsError } from './errors';

export function polygonEdges(poly: readonly Point[]): Segment[] {
  const edges: Segment[] = [];
  for (let i = 0; i < poly.length; i++) {
    edges.push({ a: poly[i]!, b: poly[(i + 1) % poly.length]! });
  }
  return edges;
}

/**
 * Property 1: the polygon must be a valid simple polygon — non-zero area, no
 * zero-length edges, non-adjacent edges share no point, adjacent edges share
 * only their common endpoint. Collinear redundant vertices are allowed.
 */
export function validatePolygon(poly: readonly Point[]): void {
  if (poly.length < 3) {
    throw new InvalidPolygonError('polygon must have at least 3 vertices');
  }
  for (const p of poly) {
    if (!isValidPoint(p)) {
      throw new InvalidPolygonError(`vertex (${p.x}, ${p.y}) is not an integer in [0, 1e6]`);
    }
  }
  const edges = polygonEdges(poly);
  for (const e of edges) {
    if (pointsEqual(e.a, e.b)) {
      throw new InvalidPolygonError(`zero-length edge at (${e.a.x}, ${e.a.y})`);
    }
  }
  if (signedArea2(poly) === 0) {
    throw new InvalidPolygonError('polygon has zero area');
  }
  const n = edges.length;
  const boxes = edges.map(segmentBBox);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (!bboxesOverlap(boxes[i]!, boxes[j]!)) continue;
      const e1 = edges[i]!;
      const e2 = edges[j]!;
      if (adjacent) {
        // The two edges share exactly one endpoint. Any further common
        // point requires collinear traversal directions with the second
        // edge doubling back over the first (a spike). Collinear edges
        // continuing in the same direction are allowed (redundant vertex).
        const d1x = e1.b.x - e1.a.x, d1y = e1.b.y - e1.a.y;
        const d2x = e2.b.x - e2.a.x, d2y = e2.b.y - e2.a.y;
        if (cross2(d1x, d1y, d2x, d2y) === 0 && dot2(d1x, d1y, d2x, d2y) < 0) {
          throw new InvalidPolygonError(
            `adjacent edges ${i} and ${j} overlap (spike)`,
          );
        }
      } else if (segmentsIntersectAny(e1, e2)) {
        throw new InvalidPolygonError(
          `non-adjacent edges ${i} and ${j} intersect`,
        );
      }
    }
  }
}

/** Property 2: the polygon must lie inside the lot [0,W] x [0,D]. */
export function validateWithinLot(poly: readonly Point[], W: number, D: number): void {
  for (const p of poly) {
    if (p.x > W || p.y > D) {
      throw new OutOfBoundsError(
        `vertex (${p.x}, ${p.y}) lies outside the lot [0,${W}]x[0,${D}]`,
      );
    }
  }
}
