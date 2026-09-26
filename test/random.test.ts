import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interiorsOverlap } from '../src/overlap';
import { signedArea2, validateSimplePolygon } from '../src/polygon';
import { collinearOverlapPositive, onSegment, orient, pointInPolygon, pointOnBoundary } from '../src/geom';
import { Point } from '../src/types';

/* ---------- 暴力参照实现：与主实现完全独立的判定路径 ---------- */

function properCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return (
    Math.sign(o1) !== 0 &&
    Math.sign(o2) !== 0 &&
    Math.sign(o3) !== 0 &&
    Math.sign(o4) !== 0 &&
    Math.sign(o1) !== Math.sign(o2) &&
    Math.sign(o3) !== Math.sign(o4)
  );
}

function edges(poly: Point[]): Array<[Point, Point]> {
  const out: Array<[Point, Point]> = [];
  for (let i = 0; i < poly.length; i++) out.push([poly[i], poly[(i + 1) % poly.length]]);
  return out;
}

/** 坐标放大 2 倍后的严格内部判定（用于边中点）。 */
function midpointStrictlyInside(p: Point, q: Point, poly: Point[]): boolean {
  const m = { x: p.x + q.x, y: p.y + q.y };
  const scaled = poly.map((r) => ({ x: 2 * r.x, y: 2 * r.y }));
  // 射线法对边界上的点不可靠，必须显式排除
  return !pointOnBoundary(m, scaled) && pointInPolygon(m, scaled);
}

function refOverlap(A: Point[], B: Point[]): boolean {
  const ea = edges(A);
  const eb = edges(B);
  // 1. 边严格相交
  for (const [a, b] of ea) for (const [c, d] of eb) if (properCross(a, b, c, d)) return true;
  // 2. 顶点严格包含（射线法对边界点不可靠，需排除）
  for (const v of A) if (!pointOnBoundary(v, B) && pointInPolygon(v, B)) return true;
  for (const v of B) if (!pointOnBoundary(v, A) && pointInPolygon(v, A)) return true;
  // 3. 共线边界重合且内部同侧。
  // 内部恒在自身有向边的固定侧（CCW 为左，CW 为右），用面积符号判定。
  const areaA = Math.sign(signedArea2(A));
  const areaB = Math.sign(signedArea2(B));
  for (const [a, b] of ea) {
    for (const [c, d] of eb) {
      if (!collinearOverlapPositive(a, b, c, d)) continue;
      const sameDir = Math.sign((d.x - c.x) * (b.x - a.x) + (d.y - c.y) * (b.y - a.y));
      if (sameDir * areaB === areaA) return true;
    }
  }
  // 4. 顶点在对方边界上，且相邻边中点严格进入对方内部
  for (let i = 0; i < A.length; i++) {
    if (!pointOnBoundary(A[i], B)) continue;
    const prev = A[(i - 1 + A.length) % A.length];
    const next = A[(i + 1) % A.length];
    if (midpointStrictlyInside(A[i], next, B) || midpointStrictlyInside(prev, A[i], B)) return true;
  }
  for (let i = 0; i < B.length; i++) {
    if (!pointOnBoundary(B[i], A)) continue;
    const prev = B[(i - 1 + B.length) % B.length];
    const next = B[(i + 1) % B.length];
    if (midpointStrictlyInside(B[i], next, A) || midpointStrictlyInside(prev, B[i], A)) return true;
  }
  return false;
}

/* ---------- 随机生成 ---------- */

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const N = 12; // 小坐标范围 [0, N]

function randInt(rnd: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

function genRect(rnd: () => number): Point[] {
  const x0 = randInt(rnd, 0, N - 2);
  const y0 = randInt(rnd, 0, N - 2);
  const x1 = randInt(rnd, x0 + 1, N);
  const y1 = randInt(rnd, y0 + 1, N);
  const poly = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  return rnd() < 0.5 ? poly.reverse() : poly;
}

/** 星形简单多边形：随机点绕质心角排序。 */
function genStar(rnd: () => number): Point[] | null {
  const k = randInt(rnd, 3, 10);
  const pts: Point[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < k; i++) {
    const p = { x: randInt(rnd, 0, N), y: randInt(rnd, 0, N) };
    const key = p.x + ',' + p.y;
    if (seen.has(key)) return null;
    seen.add(key);
    pts.push(p);
  }
  const cx = pts.reduce((s, p) => s + p.x, 0) / k;
  const cy = pts.reduce((s, p) => s + p.y, 0) / k;
  pts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
  return rnd() < 0.5 ? pts.reverse() : pts;
}

/** 轴对齐 L 形（矩形切去一个角），制造凹口与大量共线边。 */
function genL(rnd: () => number): Point[] {
  const x0 = randInt(rnd, 0, N - 3);
  const y0 = randInt(rnd, 0, N - 3);
  const x1 = randInt(rnd, x0 + 2, N);
  const y1 = randInt(rnd, y0 + 2, N);
  const mx = randInt(rnd, x0 + 1, x1 - 1);
  const my = randInt(rnd, y0 + 1, y1 - 1);
  const poly = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: my },
    { x: mx, y: my },
    { x: mx, y: y1 },
    { x: x0, y: y1 },
  ];
  return rnd() < 0.5 ? poly.reverse() : poly;
}

function genValid(rnd: () => number): Point[] {
  for (;;) {
    const r = rnd();
    const poly = r < 0.34 ? genRect(rnd) : r < 0.67 ? genStar(rnd) : genL(rnd);
    if (!poly) continue;
    try {
      validateSimplePolygon(poly);
      return poly;
    } catch {
      /* 重新生成 */
    }
  }
}

function translate(poly: Point[], dx: number, dy: number): Point[] | null {
  const out = poly.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  for (const p of out) if (p.x < 0 || p.x > N || p.y < 0 || p.y > N) return null;
  return out;
}

test('随机房间与暴力参照实现逐一比对', () => {
  const rnd = mulberry32(Number(process.env.SEED ?? 20260927));
  let checked = 0;
  let positive = 0;
  for (let iter = 0; iter < 6000; iter++) {
    const a = genValid(rnd);
    let b: Point[] | null;
    const mode = rnd();
    if (mode < 0.4) {
      // 小平移：制造大量共边、包含、交叉
      b = translate(a, randInt(rnd, -4, 4), randInt(rnd, -4, 4));
      if (!b) continue;
    } else {
      b = genValid(rnd);
    }
    const expected = refOverlap(a, b);
    const actual = interiorsOverlap(a, b);
    if (expected) positive++;
    assert.equal(actual, expected, `mismatch at iter ${iter}: A=${JSON.stringify(a)} B=${JSON.stringify(b)}`);
    checked++;
  }
  // 确保两类结果都有足够样本
  assert.ok(checked > 4000, `checked=${checked}`);
  assert.ok(positive > 200, `positive=${positive}`);
  assert.ok(checked - positive > 200, `negative=${checked - positive}`);
});
