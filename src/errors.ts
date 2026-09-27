export type ErrorCode =
  | 'INVALID_POLYGON'
  | 'OUT_OF_BOUNDS'
  | 'ROOM_OVERLAP'
  | 'WINDOW_CONFLICT'
  | 'INVALID_WINDOW'
  | 'DUPLICATE_ROOM'
  | 'ROOM_NOT_FOUND';

export class FloorPlanError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'FloorPlanError';
    this.code = code;
  }
}

export class InvalidPolygonError extends FloorPlanError {
  constructor(message: string) {
    super('INVALID_POLYGON', message);
    this.name = 'InvalidPolygonError';
  }
}

export class OutOfBoundsError extends FloorPlanError {
  constructor(message: string) {
    super('OUT_OF_BOUNDS', message);
    this.name = 'OutOfBoundsError';
  }
}

export class RoomOverlapError extends FloorPlanError {
  readonly otherId: string;
  constructor(otherId: string, message?: string) {
    super('ROOM_OVERLAP', message ?? `room interior overlaps room "${otherId}"`);
    this.name = 'RoomOverlapError';
    this.otherId = otherId;
  }
}

export class WindowConflictError extends FloorPlanError {
  readonly otherId: string;
  constructor(otherId: string, message?: string) {
    super('WINDOW_CONFLICT', message ?? `window overlaps boundary of room "${otherId}"`);
    this.name = 'WindowConflictError';
    this.otherId = otherId;
  }
}

export class InvalidWindowError extends FloorPlanError {
  constructor(message: string) {
    super('INVALID_WINDOW', message);
    this.name = 'InvalidWindowError';
  }
}

export class DuplicateRoomError extends FloorPlanError {
  readonly roomId: string;
  constructor(roomId: string) {
    super('DUPLICATE_ROOM', `room "${roomId}" already exists`);
    this.name = 'DuplicateRoomError';
    this.roomId = roomId;
  }
}

export class RoomNotFoundError extends FloorPlanError {
  readonly roomId: string;
  constructor(roomId: string) {
    super('ROOM_NOT_FOUND', `room "${roomId}" does not exist`);
    this.name = 'RoomNotFoundError';
    this.roomId = roomId;
  }
}
