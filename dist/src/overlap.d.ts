import { Point } from './geometry';
/**
 * True iff the interiors of two simple polygons intersect. Exact.
 *
 * Handles: proper edge crossings, containment (either direction, including
 * boundary-touching containment), and same-side collinear wall overlaps.
 * Boundary-only contact (shared walls with interiors on opposite sides,
 * point touches) does not count as overlap.
 */
export declare function polygonsInteriorOverlap(polyA: readonly Point[], polyB: readonly Point[]): boolean;
