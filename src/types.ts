/** 平面点，地块局部坐标，单位 1/16 英寸，[0, 1e6] 内整数。 */
export interface Point {
  x: number;
  y: number;
}

/** 窗：正长度线段，端点为整数点。 */
export interface WindowSeg {
  a: Point;
  b: Point;
}

export type FloorPlanErrorCode =
  | 'INVALID_POLYGON'
  | 'OUTSIDE_LOT'
  | 'OVERLAP'
  | 'INVALID_WINDOW'
  | 'WINDOW_OFF_BOUNDARY'
  | 'WINDOW_CONFLICT'
  | 'DUPLICATE_ROOM'
  | 'ROOM_NOT_FOUND';

export class FloorPlanError extends Error {
  readonly code: FloorPlanErrorCode;
  /** OVERLAP / WINDOW_CONFLICT 时的对方房间 id。 */
  readonly otherRoomId?: string;

  constructor(code: FloorPlanErrorCode, message: string, otherRoomId?: string) {
    super(message);
    this.name = 'FloorPlanError';
    this.code = code;
    this.otherRoomId = otherRoomId;
  }
}
