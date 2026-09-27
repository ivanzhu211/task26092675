import {
  Point, Segment, BBox, cross, cross2, segmentBBox, bboxesOverlap,
} from './geometry';

interface RoomView {
  readonly edges: readonly Segment[];
  readonly edgeBoxes: readonly BBox[];
  readonly bbox: BBox;
}

/**
 * Subtract the union of `cuts` (closed [lo, hi] intervals in projection
 * coordinates) from [lo, hi]; returns leftover intervals.
 */
function subtractIntervals(lo: number, hi: number, cuts: Array<[number, number]>): Array<[number, number]> {
  cuts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const out: Array<[number, number]> = [];
  let covered = lo;
  for (const [clo, chi] of cuts) {
    if (chi <= covered) continue;
    if (clo > covered) out.push([covered, clo]);
    covered = chi;
    if (covered >= hi) break;
  }
  if (covered < hi) out.push([covered, hi]);
  return out;
}

/**
 * Portions of the room's boundary (edges in polygon order) not coincident
 * with any other room's boundary, with adjacent collinear pieces merged.
 */
export function exteriorSegments(
  edges: readonly Segment[],
  others: readonly RoomView[],
): Segment[] {
  const result: Segment[] = [];
  for (const e of edges) {
    const dx = e.b.x - e.a.x;
    const dy = e.b.y - e.a.y;
    const useX = Math.abs(dx) >= Math.abs(dy);
    const proj = (p: Point) => (useX ? p.x : p.y);
    const elo = Math.min(proj(e.a), proj(e.b));
    const ehi = Math.max(proj(e.a), proj(e.b));
    const eBox = segmentBBox(e);

    // projection value -> the integer point on e with that projection
    const cuts: Array<[number, number]> = [];
    for (const room of others) {
      if (!bboxesOverlap(eBox, room.bbox)) continue;
      for (let i = 0; i < room.edges.length; i++) {
        if (!bboxesOverlap(eBox, room.edgeBoxes[i]!)) continue;
        const f = room.edges[i]!;
        if (cross(e.a, e.b, f.a) !== 0 || cross(e.a, e.b, f.b) !== 0) continue;
        const flo = Math.max(elo, Math.min(proj(f.a), proj(f.b)));
        const fhi = Math.min(ehi, Math.max(proj(f.a), proj(f.b)));
        if (fhi > flo) cuts.push([flo, fhi]);
      }
    }

    const leftovers = subtractIntervals(elo, ehi, cuts);
    if (leftovers.length === 0) continue;

    // Reconstruct integer points: a leftover endpoint at projection v is
    // either an endpoint of e or of a collinear overlapping edge, hence an
    // integer point on e's supporting line.
    const pointAt = (v: number): Point => {
      if (v === proj(e.a)) return e.a;
      if (v === proj(e.b)) return e.b;
      if (useX) {
        return { x: v, y: e.a.y + ((v - e.a.x) * dy) / dx };
      }
      return { x: e.a.x + ((v - e.a.y) * dx) / dy, y: v };
    };

    const forward = proj(e.a) < proj(e.b);
    for (const [v0, v1] of leftovers) {
      const seg: Segment = forward
        ? { a: pointAt(v0), b: pointAt(v1) }
        : { a: pointAt(v1), b: pointAt(v0) };
      const prev = result[result.length - 1];
      if (
        prev && prev.b.x === seg.a.x && prev.b.y === seg.a.y &&
        cross2(prev.b.x - prev.a.x, prev.b.y - prev.a.y, seg.b.x - seg.a.x, seg.b.y - seg.a.y) === 0
      ) {
        result[result.length - 1] = { a: prev.a, b: seg.b };
      } else {
        result.push(seg);
      }
    }
  }

  // Merge wrap-around: last piece may continue into the first.
  if (result.length > 1) {
    const first = result[0]!;
    const last = result[result.length - 1]!;
    if (
      last.b.x === first.a.x && last.b.y === first.a.y &&
      cross2(last.b.x - last.a.x, last.b.y - last.a.y, first.b.x - first.a.x, first.b.y - first.a.y) === 0
    ) {
      result[0] = { a: last.a, b: first.b };
      result.pop();
    }
  }
  return result;
}
