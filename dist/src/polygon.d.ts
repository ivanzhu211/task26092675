import { Point, Segment } from './geometry';
export declare function polygonEdges(poly: readonly Point[]): Segment[];
/**
 * Property 1: the polygon must be a valid simple polygon — non-zero area, no
 * zero-length edges, non-adjacent edges share no point, adjacent edges share
 * only their common endpoint. Collinear redundant vertices are allowed.
 */
export declare function validatePolygon(poly: readonly Point[]): void;
/** Property 2: the polygon must lie inside the lot [0,W] x [0,D]. */
export declare function validateWithinLot(poly: readonly Point[], W: number, D: number): void;
