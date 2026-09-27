import { Point, Segment, BBox } from './geometry';
export interface WindowSpec {
    readonly a: Point;
    readonly b: Point;
}
/** Basic window sanity: integer endpoints in range, positive length. */
export declare function validateWindowSpecs(windows: readonly WindowSpec[]): Segment[];
/**
 * True iff the window segment is fully covered by collinear boundary edges
 * (it may span redundant collinear vertices, but may not leave the boundary
 * or round a corner).
 */
export declare function windowOnBoundary(w: Segment, edges: readonly Segment[]): boolean;
/**
 * True iff window w shares a positive-length portion with any of the given
 * (other room's) boundary edges.
 */
export declare function windowTouchesBoundary(w: Segment, wBox: BBox, edges: readonly Segment[], boxes: readonly BBox[]): boolean;
/** True iff two windows of the same room overlap with positive length. */
export declare function windowsOverlap(w1: Segment, w2: Segment): boolean;
