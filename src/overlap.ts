import { trianglesInteriorIntersect } from './clip';
import { triangulate } from './polygon';
import { Point } from './types';

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function bboxOf(poly: Point[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function bboxOverlap(a: BBox, b: BBox): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
}

/** 两组三角形（两个房间的三角化）是否有正面积交集。 */
export function trisInteriorOverlap(trisA: Point[][], trisB: Point[][]): boolean {
  const boxesA = trisA.map(bboxOf);
  const boxesB = trisB.map(bboxOf);
  for (let i = 0; i < trisA.length; i++) {
    for (let j = 0; j < trisB.length; j++) {
      if (!bboxOverlap(boxesA[i], boxesB[j])) continue;
      if (trianglesInteriorIntersect(trisA[i], trisB[j])) return true;
    }
  }
  return false;
}

/** 两个简单多边形的内部是否有正面积交集（仅供测试与便捷使用，每次重新三角化）。 */
export function interiorsOverlap(polyA: Point[], polyB: Point[]): boolean {
  if (!bboxOverlap(bboxOf(polyA), bboxOf(polyB))) return false;
  const trisA = triangulate(polyA).map(([i, j, k]) => [polyA[i], polyA[j], polyA[k]]);
  const trisB = triangulate(polyB).map(([i, j, k]) => [polyB[i], polyB[j], polyB[k]]);
  return trisInteriorOverlap(trisA, trisB);
}
