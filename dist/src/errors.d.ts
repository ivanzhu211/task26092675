export declare type ErrorCode = 'INVALID_POLYGON' | 'OUT_OF_BOUNDS' | 'ROOM_OVERLAP' | 'WINDOW_CONFLICT' | 'INVALID_WINDOW' | 'DUPLICATE_ROOM' | 'ROOM_NOT_FOUND';
export declare class FloorPlanError extends Error {
    readonly code: ErrorCode;
    constructor(code: ErrorCode, message: string);
}
export declare class InvalidPolygonError extends FloorPlanError {
    constructor(message: string);
}
export declare class OutOfBoundsError extends FloorPlanError {
    constructor(message: string);
}
export declare class RoomOverlapError extends FloorPlanError {
    readonly otherId: string;
    constructor(otherId: string, message?: string);
}
export declare class WindowConflictError extends FloorPlanError {
    readonly otherId: string;
    constructor(otherId: string, message?: string);
}
export declare class InvalidWindowError extends FloorPlanError {
    constructor(message: string);
}
export declare class DuplicateRoomError extends FloorPlanError {
    readonly roomId: string;
    constructor(roomId: string);
}
export declare class RoomNotFoundError extends FloorPlanError {
    readonly roomId: string;
    constructor(roomId: string);
}
