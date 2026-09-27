import {
  Point, Segment, BBox, MAX_COORD, polygonBBox, segmentBBox, bboxesOverlap,
} from './geometry';
import {
  FloorPlanError, OutOfBoundsError, DuplicateRoomError, RoomNotFoundError,
  RoomOverlapError, WindowConflictError, InvalidWindowError,
} from './errors';
import { validatePolygon, validateWithinLot, polygonEdges } from './polygon';
import { polygonsInteriorOverlap } from './overlap';
import {
  WindowSpec, validateWindowSpecs, windowOnBoundary, windowTouchesBoundary,
  windowsOverlap,
} from './windows';
import { exteriorSegments as computeExterior } from './exterior';

export type { WindowSpec } from './windows';

interface Room {
  readonly id: string;
  readonly polygon: readonly Point[];
  readonly edges: readonly Segment[];
  readonly edgeBoxes: readonly BBox[];
  readonly bbox: BBox;
  readonly windows: readonly Segment[];
  readonly windowBoxes: readonly BBox[];
}

export class FloorPlan {
  readonly W: number;
  readonly D: number;
  private readonly rooms = new Map<string, Room>();

  constructor(W: number, D: number) {
    if (!Number.isInteger(W) || !Number.isInteger(D) || W < 1 || D < 1 || W > MAX_COORD || D > MAX_COORD) {
      throw new OutOfBoundsError(`lot dimensions must be integers in [1, 1e6], got ${W} x ${D}`);
    }
    this.W = W;
    this.D = D;
  }

  addRoom(id: string, polygon: readonly Point[], windows: readonly WindowSpec[] = []): void {
    if (this.rooms.has(id)) throw new DuplicateRoomError(id);
    const room = this.buildRoom(id, polygon, windows, null);
    this.rooms.set(id, room);
  }

  updateRoom(id: string, polygon: readonly Point[], windows: readonly WindowSpec[] = []): void {
    if (!this.rooms.has(id)) throw new RoomNotFoundError(id);
    const room = this.buildRoom(id, polygon, windows, id);
    this.rooms.set(id, room);
  }

  removeRoom(id: string): void {
    if (!this.rooms.delete(id)) throw new RoomNotFoundError(id);
  }

  hasRoom(id: string): boolean {
    return this.rooms.has(id);
  }

  roomCount(): number {
    return this.rooms.size;
  }

  /**
   * Boundary pieces of the room not coincident with any other room's
   * boundary; adjacent collinear pieces are merged.
   */
  exteriorSegments(id: string): Segment[] {
    const room = this.rooms.get(id);
    if (!room) throw new RoomNotFoundError(id);
    const others: Room[] = [];
    for (const other of this.rooms.values()) {
      if (other.id !== id && bboxesOverlap(room.bbox, other.bbox)) others.push(other);
    }
    return computeExterior(room.edges, others);
  }

  /** Validate a prospective room against the current plan; pure (no mutation). */
  private buildRoom(id: string, polygon: readonly Point[], windowSpecs: readonly WindowSpec[], replaceId: string | null): Room {
    const poly = polygon.map((p) => ({ x: p.x, y: p.y }));
    validatePolygon(poly);
    validateWithinLot(poly, this.W, this.D);

    const edges = polygonEdges(poly);
    const edgeBoxes = edges.map(segmentBBox);
    const bbox = polygonBBox(poly);

    const windows = validateWindowSpecs(windowSpecs);
    for (const w of windows) {
      if (!windowOnBoundary(w, edges)) {
        throw new InvalidWindowError(
          `window (${w.a.x}, ${w.a.y})-(${w.b.x}, ${w.b.y}) does not lie on the boundary of room "${id}"`,
        );
      }
    }
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        if (windowsOverlap(windows[i]!, windows[j]!)) {
          throw new WindowConflictError(id, `windows ${i} and ${j} of room "${id}" overlap`);
        }
      }
    }
    const windowBoxes = windows.map(segmentBBox);

    for (const other of this.rooms.values()) {
      if (other.id === replaceId) continue;
      if (!bboxesOverlap(bbox, other.bbox)) continue;
      if (polygonsInteriorOverlap(poly, other.polygon)) {
        throw new RoomOverlapError(other.id);
      }
      for (let k = 0; k < windows.length; k++) {
        if (windowTouchesBoundary(windows[k]!, windowBoxes[k]!, other.edges, other.edgeBoxes)) {
          throw new WindowConflictError(other.id, `window ${k} of room "${id}" overlaps the boundary of room "${other.id}"`);
        }
      }
      for (let k = 0; k < other.windows.length; k++) {
        if (windowTouchesBoundary(other.windows[k]!, other.windowBoxes[k]!, edges, edgeBoxes)) {
          throw new WindowConflictError(other.id, `boundary of room "${id}" covers window ${k} of room "${other.id}"`);
        }
      }
    }

    return { id, polygon: poly, edges, edgeBoxes, bbox, windows, windowBoxes };
  }
}

export { FloorPlanError };
