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
export declare const MAX_COORD = 1000000;
export declare function isValidCoord(v: number): boolean;
export declare function isValidPoint(p: Point): boolean;
/** 2D cross product of vectors (o->a) and (o->b). Exact. */
export declare function cross(o: Point, a: Point, b: Point): number;
/** Cross product of two vectors given as dx/dy pairs. Exact. */
export declare function cross2(ux: number, uy: number, vx: number, vy: number): number;
export declare function dot2(ux: number, uy: number, vx: number, vy: number): number;
export declare function pointsEqual(p: Point, q: Point): boolean;
/** Twice the signed area; positive iff vertices are counter-clockwise. Exact. */
export declare function signedArea2(poly: readonly Point[]): number;
/** True iff p lies on segment s (including endpoints). Exact. */
export declare function pointOnSegment(p: Point, s: Segment): boolean;
export interface BBox {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}
export declare function segmentBBox(s: Segment): BBox;
export declare function polygonBBox(poly: readonly Point[]): BBox;
export declare function bboxesOverlap(b1: BBox, b2: BBox): boolean;
/**
 * True iff the two segments cross at a point interior to both
 * (a proper, non-collinear crossing). Exact.
 */
export declare function segmentsProperlyCross(s1: Segment, s2: Segment): boolean;
/** True iff the two segments share at least one point. Exact. */
export declare function segmentsIntersectAny(s1: Segment, s2: Segment): boolean;
/**
 * True iff the two segments are collinear and their intersection has
 * positive length. Exact.
 */
export declare function segmentsCollinearOverlap(s1: Segment, s2: Segment): boolean;
export declare type PointLocation = 'inside' | 'outside' | 'boundary';
/**
 * Strict point-in-polygon for an integer point against an integer simple
 * polygon. Points exactly on the boundary report 'boundary'. Exact.
 */
export declare function locatePointInPolygon(p: Point, poly: readonly Point[]): PointLocation;
/**
 * Strict point-in-polygon for a rational point (X/D, Y/D), D > 0, against an
 * integer simple polygon. Exact via BigInt. Points on the boundary report
 * 'boundary'.
 */
export declare function locateRationalPointInPolygon(X: bigint, Y: bigint, D: bigint, poly: readonly Point[]): PointLocation;
