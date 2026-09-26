import { Point } from './types';

/** orient(a,b,c): >0 逆时针, <0 顺时针, 0 共线。坐标 <=1e6，结果 <=2e12，double 精确。 */
export function orient(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** p 是否在线段 ab 上（含端点），调用前不要求共线。 */
export function onSegment(a: Point, b: Point, p: Point): boolean {
  if (orient(a, b, p) !== 0) return false;
  return (
    Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y)
  );
}

/** 两线段是否有任意公共点（含端点接触、共线重合）。 */
export function segmentsTouch(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

/** 两线段是否共线且重合长度为正。 */
export function collinearOverlapPositive(a: Point, b: Point, c: Point, d: Point): boolean {
  if (orient(a, b, c) !== 0 || orient(a, b, d) !== 0) return false;
  // 共线：用较长轴向坐标做区间比较，避免除法。
  const useX = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const a0 = useX ? a.x : a.y;
  const b0 = useX ? b.x : b.y;
  const c0 = useX ? c.x : c.y;
  const d0 = useX ? d.x : d.y;
  const lo = Math.max(Math.min(a0, b0), Math.min(c0, d0));
  const hi = Math.min(Math.max(a0, b0), Math.max(c0, d0));
  return lo < hi;
}

/** 点是否在简单多边形内部（严格，不含边界）。射线法 + 精确整数谓词。 */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[j];
    const b = poly[i];
    // 边 (a,b) 与自 p 出发向 +x 的射线相交判定
    const aAbove = a.y > p.y;
    const bAbove = b.y > p.y;
    if (aAbove !== bAbove) {
      // 交点 x 坐标与 p.x 比较：用 orient 避免除法
      // 交点在 p 右侧 <=> orient(a, b, p) 的符号与边的走向一致
      const o = orient(a, b, p);
      if (aAbove ? o < 0 : o > 0) inside = !inside;
    }
  }
  return inside;
}

/** 点是否在多边形边界上。 */
export function pointOnBoundary(p: Point, poly: Point[]): boolean {
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    if (onSegment(poly[j], poly[i], p)) return true;
  }
  return false;
}
