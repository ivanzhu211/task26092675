import { FloorPlanError, Point } from './types';
import { orient, onSegment, pointInPolygon, segmentsTouch } from './geom';

/** 有向面积两倍（shoelace）。64 顶点 * 1e12 << 2^53，double 精确。 */
export function signedArea2(poly: Point[]): number {
  let s = 0;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    s += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
  }
  return s;
}

/**
 * 校验简单多边形（性质 1）：
 * 面积非零、无零长边、非相邻边无公共点、相邻边仅共享端点。
 * 允许共线的冗余顶点（180°），但不允许相邻边重叠（尖刺）。
 */
export function validateSimplePolygon(poly: Point[]): void {
  const n = poly.length;
  if (!Array.isArray(poly) || n < 3) {
    throw new FloorPlanError('INVALID_POLYGON', 'polygon needs at least 3 vertices');
  }
  for (const p of poly) {
    if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) {
      throw new FloorPlanError('INVALID_POLYGON', 'vertex coordinates must be integers');
    }
  }
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    if (a.x === b.x && a.y === b.y) {
      throw new FloorPlanError('INVALID_POLYGON', 'zero-length edge');
    }
  }
  if (signedArea2(poly) === 0) {
    throw new FloorPlanError('INVALID_POLYGON', 'degenerate (zero-area) polygon');
  }
  // 边对检查。相邻边（含首尾）只允许共享连接端点；非相邻边不允许任何公共点。
  for (let i = 0; i < n; i++) {
    const a1 = poly[i];
    const a2 = poly[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      const b1 = poly[j];
      const b2 = poly[(j + 1) % n];
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) {
        // j === i+1 时共享端点是 a2(===b1)，非共享端点是 a1 与 b2；
        // 环绕对 (i===0, j===n-1) 时共享端点是 a1(===b2)，非共享端点是 a2 与 b1。
        // 非共享端点落在对方边上 => 相邻边存在共享端点之外的公共点。
        const bad = j === i + 1
          ? onSegment(a1, a2, b2) || onSegment(b1, b2, a1)
          : onSegment(a1, a2, b1) || onSegment(b1, b2, a2);
        if (bad) {
          throw new FloorPlanError('INVALID_POLYGON', 'adjacent edges overlap beyond shared endpoint');
        }
      } else if (segmentsTouch(a1, a2, b1, b2)) {
        throw new FloorPlanError('INVALID_POLYGON', 'non-adjacent edges intersect');
      }
    }
  }
}

/** 耳切三角化，返回三角形顶点索引三元组。O(n^2)，n<=64。 */
export function triangulate(poly: Point[]): Array<[number, number, number]> {
  const n = poly.length;
  const ccw = signedArea2(poly) > 0;
  // 剩余顶点索引链表
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(i);
  const tris: Array<[number, number, number]> = [];

  const isConvex = (a: Point, b: Point, c: Point): boolean => {
    const o = orient(a, b, c);
    return ccw ? o > 0 : o < 0;
  };

  let guard = 0;
  let m = idx.length;
  let i = 0;
  while (m > 3) {
    if (++guard > n * n) {
      // 理论上合法简单多边形不会发生；防御性抛出
      throw new FloorPlanError('INVALID_POLYGON', 'triangulation failed');
    }
    const iPrev = idx[(i - 1 + m) % m];
    const iCur = idx[i % m];
    const iNext = idx[(i + 1) % m];
    const a = poly[iPrev];
    const b = poly[iCur];
    const c = poly[iNext];
    if (isConvex(a, b, c)) {
      // 检查其他顶点是否在三角形 (a,b,c) 内（严格内部；边界上的点只可能是共线冗余点）
      let ear = true;
      for (let k = 0; k < m; k++) {
        const ik = idx[k];
        if (ik === iPrev || ik === iCur || ik === iNext) continue;
        const p = poly[ik];
        if (pointInTriangleStrictOrOn(p, a, b, c, ccw)) {
          ear = false;
          break;
        }
      }
      if (ear) {
        tris.push([iPrev, iCur, iNext]);
        idx.splice(i % m, 1);
        m--;
        if (i >= m) i = 0;
        continue;
      }
    }
    i = (i + 1) % m;
  }
  tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}

/** p 是否在三角形（含边界）内。仅用于耳切，顶点共线也算挡住（保守）。 */
function pointInTriangleStrictOrOn(p: Point, a: Point, b: Point, c: Point, ccw: boolean): boolean {
  const o1 = orient(a, b, p);
  const o2 = orient(b, c, p);
  const o3 = orient(c, a, p);
  if (ccw) return o1 >= 0 && o2 >= 0 && o3 >= 0;
  return o1 <= 0 && o2 <= 0 && o3 <= 0;
}

/** 多边形是否完全在地块 [0,W]x[0,D] 内（凸地块 + 简单多边形 => 只需检查顶点）。 */
export function insideLot(poly: Point[], W: number, D: number): boolean {
  for (const p of poly) {
    if (p.x < 0 || p.x > W || p.y < 0 || p.y > D) return false;
  }
  return true;
}

export { pointInPolygon };
