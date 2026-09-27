"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomNotFoundError = exports.DuplicateRoomError = exports.InvalidWindowError = exports.WindowConflictError = exports.RoomOverlapError = exports.OutOfBoundsError = exports.InvalidPolygonError = exports.FloorPlanError = void 0;
class FloorPlanError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'FloorPlanError';
        this.code = code;
    }
}
exports.FloorPlanError = FloorPlanError;
class InvalidPolygonError extends FloorPlanError {
    constructor(message) {
        super('INVALID_POLYGON', message);
        this.name = 'InvalidPolygonError';
    }
}
exports.InvalidPolygonError = InvalidPolygonError;
class OutOfBoundsError extends FloorPlanError {
    constructor(message) {
        super('OUT_OF_BOUNDS', message);
        this.name = 'OutOfBoundsError';
    }
}
exports.OutOfBoundsError = OutOfBoundsError;
class RoomOverlapError extends FloorPlanError {
    constructor(otherId, message) {
        super('ROOM_OVERLAP', message ?? `room interior overlaps room "${otherId}"`);
        this.name = 'RoomOverlapError';
        this.otherId = otherId;
    }
}
exports.RoomOverlapError = RoomOverlapError;
class WindowConflictError extends FloorPlanError {
    constructor(otherId, message) {
        super('WINDOW_CONFLICT', message ?? `window overlaps boundary of room "${otherId}"`);
        this.name = 'WindowConflictError';
        this.otherId = otherId;
    }
}
exports.WindowConflictError = WindowConflictError;
class InvalidWindowError extends FloorPlanError {
    constructor(message) {
        super('INVALID_WINDOW', message);
        this.name = 'InvalidWindowError';
    }
}
exports.InvalidWindowError = InvalidWindowError;
class DuplicateRoomError extends FloorPlanError {
    constructor(roomId) {
        super('DUPLICATE_ROOM', `room "${roomId}" already exists`);
        this.name = 'DuplicateRoomError';
        this.roomId = roomId;
    }
}
exports.DuplicateRoomError = DuplicateRoomError;
class RoomNotFoundError extends FloorPlanError {
    constructor(roomId) {
        super('ROOM_NOT_FOUND', `room "${roomId}" does not exist`);
        this.name = 'RoomNotFoundError';
        this.roomId = roomId;
    }
}
exports.RoomNotFoundError = RoomNotFoundError;
