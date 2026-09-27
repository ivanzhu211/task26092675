/**
 * Brute-force reference implementation of interior-overlap, written directly
 * from the specification with no spatial pruning and no shared machinery
 * from src/overlap.ts. Used as the oracle for randomized comparison.
 */
import { Point } from '../src/geometry';
/** True iff the interiors of two simple polygons intersect. */
export declare function referenceInteriorOverlap(A: readonly Point[], B: readonly Point[]): boolean;
