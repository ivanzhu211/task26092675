"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWithinLot = exports.validatePolygon = exports.polygonEdges = void 0;
const geometry_1 = require("./geometry");
const errors_1 = require("./errors");
function polygonEdges(poly) {
    const edges = [];
    for (let i = 0; i < poly.length; i++) {
        edges.push({ a: poly[i], b: poly[(i + 1) % poly.length] });
    }
    return edges;
}
exports.polygonEdges = polygonEdges;
/**
 * Property 1: the polygon must be a valid simple polygon — non-zero area, no
 * zero-length edges, non-adjacent edges share no point, adjacent edges share
 * only their common endpoint. Collinear redundant vertices are allowed.
 */
function validatePolygon(poly) {
    if (poly.length < 3) {
        throw new errors_1.InvalidPolygonError('polygon must have at least 3 vertices');
    }
    for (const p of poly) {
        if (!(0, geometry_1.isValidPoint)(p)) {
            throw new errors_1.InvalidPolygonError(`vertex (${p.x}, ${p.y}) is not an integer in [0, 1e6]`);
        }
    }
    const edges = polygonEdges(poly);
    for (const e of edges) {
        if ((0, geometry_1.pointsEqual)(e.a, e.b)) {
            throw new errors_1.InvalidPolygonError(`zero-length edge at (${e.a.x}, ${e.a.y})`);
        }
    }
    if ((0, geometry_1.signedArea2)(poly) === 0) {
        throw new errors_1.InvalidPolygonError('polygon has zero area');
    }
    const n = edges.length;
    const boxes = edges.map(geometry_1.segmentBBox);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const adjacent = j === i + 1 || (i === 0 && j === n - 1);
            if (!(0, geometry_1.bboxesOverlap)(boxes[i], boxes[j]))
                continue;
            const e1 = edges[i];
            const e2 = edges[j];
            if (adjacent) {
                // The two edges share exactly one endpoint. Any further common
                // point requires collinear traversal directions with the second
                // edge doubling back over the first (a spike). Collinear edges
                // continuing in the same direction are allowed (redundant vertex).
                const d1x = e1.b.x - e1.a.x, d1y = e1.b.y - e1.a.y;
                const d2x = e2.b.x - e2.a.x, d2y = e2.b.y - e2.a.y;
                if ((0, geometry_1.cross2)(d1x, d1y, d2x, d2y) === 0 && (0, geometry_1.dot2)(d1x, d1y, d2x, d2y) < 0) {
                    throw new errors_1.InvalidPolygonError(`adjacent edges ${i} and ${j} overlap (spike)`);
                }
            }
            else if ((0, geometry_1.segmentsIntersectAny)(e1, e2)) {
                throw new errors_1.InvalidPolygonError(`non-adjacent edges ${i} and ${j} intersect`);
            }
        }
    }
}
exports.validatePolygon = validatePolygon;
/** Property 2: the polygon must lie inside the lot [0,W] x [0,D]. */
function validateWithinLot(poly, W, D) {
    for (const p of poly) {
        if (p.x > W || p.y > D) {
            throw new errors_1.OutOfBoundsError(`vertex (${p.x}, ${p.y}) lies outside the lot [0,${W}]x[0,${D}]`);
        }
    }
}
exports.validateWithinLot = validateWithinLot;
