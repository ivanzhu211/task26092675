"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const floorplan_1 = require("../src/floorplan");
const errors_1 = require("../src/errors");
const polygon_1 = require("../src/polygon");
const reference_1 = require("./reference");
function mulberry32(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const N = 24; // small coordinate range: dense touches, shared walls, collinearities
function randomRect(rnd) {
    const x0 = Math.floor(rnd() * (N - 2));
    const y0 = Math.floor(rnd() * (N - 2));
    const x1 = x0 + 1 + Math.floor(rnd() * (N - x0 - 1));
    const y1 = y0 + 1 + Math.floor(rnd() * (N - y0 - 1));
    return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}
function randomConvex(rnd) {
    const count = 3 + Math.floor(rnd() * 6);
    const pts = [];
    for (let i = 0; i < count; i++) {
        pts.push({ x: Math.floor(rnd() * (N + 1)), y: Math.floor(rnd() * (N + 1)) });
    }
    pts.sort((p, q) => p.x - q.x || p.y - q.y);
    const crossZ = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const p of pts) {
        while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
            lower.pop();
        lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
            upper.pop();
        upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
}
function randomStar(rnd) {
    const R = 2 + Math.floor(rnd() * 6);
    const cx = R + Math.floor(rnd() * (N - 2 * R + 1));
    const cy = R + Math.floor(rnd() * (N - 2 * R + 1));
    const k = 3 + Math.floor(rnd() * 6);
    const angles = [];
    for (let i = 0; i < k; i++)
        angles.push(rnd() * 2 * Math.PI);
    angles.sort((a, b) => a - b);
    return angles.map((t) => {
        const r = 1 + rnd() * R;
        return {
            x: Math.round(cx + r * Math.cos(t)),
            y: Math.round(cy + r * Math.sin(t)),
        };
    });
}
function randomPolygon(rnd) {
    const kind = rnd();
    const poly = kind < 0.45 ? randomRect(rnd) : kind < 0.75 ? randomConvex(rnd) : randomStar(rnd);
    if (poly.length < 3)
        return null;
    if (poly.some((p) => p.x < 0 || p.x > N || p.y < 0 || p.y > N))
        return null;
    try {
        (0, polygon_1.validatePolygon)(poly);
    }
    catch {
        return null;
    }
    return poly;
}
(0, node_test_1.test)('randomized comparison against brute-force reference (addRoom)', () => {
    const rnd = mulberry32(20260926);
    const fp = new floorplan_1.FloorPlan(N, N);
    const rooms = [];
    let comparisons = 0;
    let accepted = 0;
    for (let iter = 0; iter < 6000 && accepted < 80; iter++) {
        const poly = randomPolygon(rnd);
        if (!poly)
            continue;
        const overlapWith = rooms.find((r) => (0, reference_1.referenceInteriorOverlap)(poly, r.poly));
        comparisons++;
        const id = `r${iter}`;
        if (overlapWith) {
            assert.throws(() => fp.addRoom(id, poly), (e) => e instanceof errors_1.RoomOverlapError && e.otherId === overlapWith.id, `expected overlap with ${overlapWith.id}`);
        }
        else {
            fp.addRoom(id, poly);
            rooms.push({ id, poly });
            accepted++;
        }
    }
    assert.ok(comparisons > 1000, `too few comparisons: ${comparisons}`);
    assert.ok(accepted >= 25, `too few accepted rooms: ${accepted}`);
});
(0, node_test_1.test)('randomized comparison against brute-force reference (updateRoom)', () => {
    const rnd = mulberry32(87543210);
    const fp = new floorplan_1.FloorPlan(N, N);
    const rooms = [];
    // seed a few rooms
    for (let iter = 0; rooms.length < 12 && iter < 4000; iter++) {
        const poly = randomPolygon(rnd);
        if (!poly)
            continue;
        if (rooms.some((r) => (0, reference_1.referenceInteriorOverlap)(poly, r.poly)))
            continue;
        const id = `s${rooms.length}`;
        fp.addRoom(id, poly);
        rooms.push({ id, poly });
    }
    assert.ok(rooms.length >= 8);
    let comparisons = 0;
    for (let iter = 0; iter < 3000; iter++) {
        const poly = randomPolygon(rnd);
        if (!poly)
            continue;
        const idx = Math.floor(rnd() * rooms.length);
        const target = rooms[idx];
        const others = rooms.filter((_, i) => i !== idx);
        const overlapWith = others.find((r) => (0, reference_1.referenceInteriorOverlap)(poly, r.poly));
        comparisons++;
        if (overlapWith) {
            assert.throws(() => fp.updateRoom(target.id, poly), (e) => e instanceof errors_1.RoomOverlapError && e.otherId === overlapWith.id);
        }
        else {
            fp.updateRoom(target.id, poly);
            rooms[idx] = { id: target.id, poly };
        }
    }
    assert.ok(comparisons > 800, `too few comparisons: ${comparisons}`);
});
