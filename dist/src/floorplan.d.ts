import { Point, Segment } from './geometry';
import { FloorPlanError } from './errors';
import { WindowSpec } from './windows';
export type { WindowSpec } from './windows';
export declare class FloorPlan {
    readonly W: number;
    readonly D: number;
    private readonly rooms;
    constructor(W: number, D: number);
    addRoom(id: string, polygon: readonly Point[], windows?: readonly WindowSpec[]): void;
    updateRoom(id: string, polygon: readonly Point[], windows?: readonly WindowSpec[]): void;
    removeRoom(id: string): void;
    hasRoom(id: string): boolean;
    roomCount(): number;
    /**
     * Boundary pieces of the room not coincident with any other room's
     * boundary; adjacent collinear pieces are merged.
     */
    exteriorSegments(id: string): Segment[];
    /** Validate a prospective room against the current plan; pure (no mutation). */
    private buildRoom;
}
export { FloorPlanError };
