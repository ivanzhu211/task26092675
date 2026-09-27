import { Segment, BBox } from './geometry';
interface RoomView {
    readonly edges: readonly Segment[];
    readonly edgeBoxes: readonly BBox[];
    readonly bbox: BBox;
}
/**
 * Portions of the room's boundary (edges in polygon order) not coincident
 * with any other room's boundary, with adjacent collinear pieces merged.
 */
export declare function exteriorSegments(edges: readonly Segment[], others: readonly RoomView[]): Segment[];
export {};
