import { Point } from './types';

/**
 * 齐次坐标有理点：仿射点 = (x/z, y/z)，z > 0。
 * 全部用 BigInt，精确无舍入。
 */
interface H {
  x: bigint;
  y: bigint;
  z: bigint;
}

function fromPoint(p: Point): H {
  return { x: BigInt(p.x), y: BigInt(p.y), z: 1n };
}

/** 三维叉积：两点 -> 所在直线；两直线 -> 交点。 */
function cross3(a: H, b: H): H {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** 点 p 相对直线 l 的带符号侧（l·p）。 */
function side(l: H, p: H): bigint {
  return l.x * p.x + l.y * p.y + l.z * p.z;
}

/** 用半平面 side>=0 裁剪多边形（Sutherland–Hodgman，凸裁剪区域）。 */
function clipHalfPlane(poly: H[], line: H): H[] {
  const out: H[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const s = poly[i];
    const e = poly[(i + 1) % n];
    const ss = side(line, s);
    const se = side(line, e);
    if (ss >= 0n) out.push(s);
    if ((ss > 0n && se < 0n) || (ss < 0n && se > 0n)) {
      const p = cross3(line, cross3(s, e));
      // 归一化 z > 0，保证后续 side() 符号一致
      if (p.z < 0n) {
        out.push({ x: -p.x, y: -p.y, z: -p.z });
      } else {
        out.push(p);
      }
    }
  }
  return out;
}

/** 结果是否全部共线（或不足 3 个不同点）=> 交集无正面积。 */
function allCollinear(poly: H[]): boolean {
  if (poly.length < 3) return true;
  // 找两个不同的点（射影意义下）
  let line: H | null = null;
  for (let i = 1; i < poly.length; i++) {
    const l = cross3(poly[0], poly[i]);
    if (l.x !== 0n || l.y !== 0n || l.z !== 0n) {
      line = l;
      break;
    }
  }
  if (line === null) return true; // 所有点重合
  for (const p of poly) {
    if (side(line, p) !== 0n) return false;
  }
  return true;
}

/**
 * 两个（非退化）三角形的内部是否有正面积交集。
 * 用 t2 的三条边所在半平面裁剪 t1，交集为凸集；
 * 凸集有正面积 <=> 裁剪结果含不共线的三个点。
 * 仅接触（点/边接触）会得到共线或重合的结果，返回 false。
 */
export function trianglesInteriorIntersect(t1: Point[], t2: Point[]): boolean {
  let poly: H[] = t1.map(fromPoint);
  const h2 = t2.map(fromPoint);
  for (let i = 0; i < 3; i++) {
    const a = h2[i];
    const b = h2[(i + 1) % 3];
    const c = h2[(i + 2) % 3];
    let line = cross3(a, b);
    if (side(line, c) < 0n) {
      line = { x: -line.x, y: -line.y, z: -line.z };
    }
    poly = clipHalfPlane(poly, line);
    if (poly.length === 0) return false;
  }
  return !allCollinear(poly);
}
