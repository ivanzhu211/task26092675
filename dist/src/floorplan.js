"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloorPlanError = exports.FloorPlan = void 0;
const geometry_1 = require("./geometry");
const errors_1 = require("./errors");
Object.defineProperty(exports, "FloorPlanError", { enumerable: true, get: function () { return errors_1.FloorPlanError; } });
const polygon_1 = require("./polygon");
const overlap_1 = require("./overlap");
const windows_1 = require("./windows");
const exterior_1 = require("./exterior");
class FloorPlan {
    constructor(W, D) {
        this.rooms = new Map();
        if (!Number.isInteger(W) || !Number.isInteger(D) || W < 1 || D < 1 || W > geometry_1.MAX_COORD || D > geometry_1.MAX_COORD) {
            throw new errors_1.OutOfBoundsError(`lot dimensions must be integers in [1, 1e6], got ${W} x ${D}`);
        }
        this.W = W;
        this.D = D;
    }
    addRoom(id, polygon, windows = []) {
        if (this.rooms.has(id))
            throw new errors_1.DuplicateRoomError(id);
        const room = this.buildRoom(id, polygon, windows, null);
        this.rooms.set(id, room);
    }
    updateRoom(id, polygon, windows = []) {
        if (!this.rooms.has(id))
            throw new errors_1.RoomNotFoundError(id);
        const room = this.buildRoom(id, polygon, windows, id);
        this.rooms.set(id, room);
    }
    removeRoom(id) {
        if (!this.rooms.delete(id))
            throw new errors_1.RoomNotFoundError(id);
    }
    hasRoom(id) {
        return this.rooms.has(id);
    }
    roomCount() {
        return this.rooms.size;
    }
    /**
     * Boundary pieces of the room not coincident with any other room's
     * boundary; adjacent collinear pieces are merged.
     */
    exteriorSegments(id) {
        const room = this.rooms.get(id);
        if (!room)
            throw new errors_1.RoomNotFoundError(id);
        const others = [];
        for (const other of this.rooms.values()) {
            if (other.id !== id && (0, geometry_1.bboxesOverlap)(room.bbox, other.bbox))
                others.push(other);
        }
        return (0, exterior_1.exteriorSegments)(room.edges, others);
    }
    /** Validate a prospective room against the current plan; pure (no mutation). */
    buildRoom(id, polygon, windowSpecs, replaceId) {
        const poly = polygon.map((p) => ({ x: p.x, y: p.y }));
        (0, polygon_1.validatePolygon)(poly);
        (0, polygon_1.validateWithinLot)(poly, this.W, this.D);
        const edges = (0, polygon_1.polygonEdges)(poly);
        const edgeBoxes = edges.map(geometry_1.segmentBBox);
        const bbox = (0, geometry_1.polygonBBox)(poly);
        const windows = (0, windows_1.validateWindowSpecs)(windowSpecs);
        for (const w of windows) {
            if (!(0, windows_1.windowOnBoundary)(w, edges)) {
                throw new errors_1.InvalidWindowError(`window (${w.a.x}, ${w.a.y})-(${w.b.x}, ${w.b.y}) does not lie on the boundary of room "${id}"`);
            }
        }
        for (let i = 0; i < windows.length; i++) {
            for (let j = i + 1; j < windows.length; j++) {
                if ((0, windows_1.windowsOverlap)(windows[i], windows[j])) {
                    throw new errors_1.WindowConflictError(id, `windows ${i} and ${j} of room "${id}" overlap`);
                }
            }
        }
        const windowBoxes = windows.map(geometry_1.segmentBBox);
        for (const other of this.rooms.values()) {
            if (other.id === replaceId)
                continue;
            if (!(0, geometry_1.bboxesOverlap)(bbox, other.bbox))
                continue;
            if ((0, overlap_1.polygonsInteriorOverlap)(poly, other.polygon)) {
                throw new errors_1.RoomOverlapError(other.id);
            }
            for (let k = 0; k < windows.length; k++) {
                if ((0, windows_1.windowTouchesBoundary)(windows[k], windowBoxes[k], other.edges, other.edgeBoxes)) {
                    throw new errors_1.WindowConflictError(other.id, `window ${k} of room "${id}" overlaps the boundary of room "${other.id}"`);
                }
            }
            for (let k = 0; k < other.windows.length; k++) {
                if ((0, windows_1.windowTouchesBoundary)(other.windows[k], other.windowBoxes[k], edges, edgeBoxes)) {
                    throw new errors_1.WindowConflictError(other.id, `boundary of room "${id}" covers window ${k} of room "${other.id}"`);
                }
            }
        }
        return { id, polygon: poly, edges, edgeBoxes, bbox, windows, windowBoxes };
    }
}
exports.FloorPlan = FloorPlan;
