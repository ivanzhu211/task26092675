import { collinearOverlapPositive, onSegment, orient } from './geom';
import { insideLot, signedArea2, triangulate, validateSimplePolygon } from './polygon';
import { trisInteriorOverlap } from './overlap';
import { FloorPlanError, Point, WindowSeg } from './types';

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 边界上的一段极大共线直线段（已合并冗余顶点）。 */
interface Run {
  a: Point;
  b: Point;
}

interface Room {
  id: string;
  poly: Point[];
  windows: WindowSeg[];
  tris: Point[][];
  bbox: BBox;
  runs: Run[];
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

/** 计算多边形边界的极大共线runs（合并相邻共线边，含跨 0 号顶点的环绕合并）。 */
function boundaryRuns(poly: Point[]): Run[] {
  const n = poly.length;
  // 找一个方向发生变化的边作为起点，避免环绕合并的边界情形
  let start = -1;
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n];
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    if (orient(p0, p1, p2) !== 0) {
      start = i;
      break;
    }
  }
  // 面积非零的简单多边形不可能所有边共线
  if (start < 0) throw new FloorPlanError('INVALID_POLYGON', 'all edges collinear');
  const runs: Run[] = [];
  let runStart = poly[start];
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n; // 当前顶点
    const prev = poly[(i - 1 + n) % n];
    const next = poly[(i + 1) % n];
    if (orient(prev, poly[i], next) !== 0) {
      runs.push({ a: runStart, b: poly[i] });
      runStart = poly[i];
    }
  }
  return runs;
}

function* edgesOf(poly: Point[]): Generator<[Point, Point]> {
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    yield [poly[i], poly[(i + 1) % n]];
  }
}

export class FloorPlan {
  private readonly W: number;
  private readonly D: number;
  private readonly rooms = new Map<string, Room>();

  constructor(W: number, D: number) {
    if (!Number.isInteger(W) || !Number.isInteger(D) || W <= 0 || D <= 0 || W > 1e6 || D > 1e6) {
      throw new FloorPlanError('INVALID_POLYGON', 'lot dimensions must be integers in (0, 1e6]');
    }
    this.W = W;
    this.D = D;
  }

  addRoom(id: string, polygon: Point[], windows: WindowSeg[] = []): void {
    if (this.rooms.has(id)) {
      throw new FloorPlanError('DUPLICATE_ROOM', `room '${id}' already exists`);
    }
    const room = this.buildRoom(id, polygon, windows);
    this.checkAgainstOthers(room, id);
    this.rooms.set(id, room);
  }

  updateRoom(id: string, polygon: Point[], windows: WindowSeg[] = []): void {
    if (!this.rooms.has(id)) {
      throw new FloorPlanError('ROOM_NOT_FOUND', `room '${id}' does not exist`);
    }
    const room = this.buildRoom(id, polygon, windows);
    this.checkAgainstOthers(room, id);
    this.rooms.set(id, room);
  }

  removeRoom(id: string): void {
    if (!this.rooms.delete(id)) {
      throw new FloorPlanError('ROOM_NOT_FOUND', `room '${id}' does not exist`);
    }
  }

  /** 该房间边界上不与任何其他房间边界重合的部分（相邻共线段已合并）。 */
  exteriorSegments(id: string): Array<{ a: Point; b: Point }> {
    const room = this.rooms.get(id);
    if (!room) {
      throw new FloorPlanError('ROOM_NOT_FOUND', `room '${id}' does not exist`);
    }
    const result: Array<{ a: Point; b: Point }> = [];
    for (const run of room.runs) {
      // 收集需要挖掉的重合区间（用实际整数点表示）
      const cuts: Array<{ lo: Point; hi: Point }> = [];
      for (const other of this.rooms.values()) {
        if (other.id === id || !bboxOverlap(room.bbox, other.bbox)) continue;
        for (const [c, d] of edgesOf(other.poly)) {
          if (!collinearOverlapPositive(run.a, run.b, c, d)) continue;
          // 重合区间端点 = 同时在两条线段上的那四个端点中的极值点
          const cand: Point[] = [];
          if (onSegment(run.a, run.b, c)) cand.push(c);
          if (onSegment(run.a, run.b, d)) cand.push(d);
          if (onSegment(c, d, run.a)) cand.push(run.a);
          if (onSegment(c, d, run.b)) cand.push(run.b);
          let lo = cand[0];
          let hi = cand[0];
          for (const p of cand) {
            if (runT(run, p) < runT(run, lo)) lo = p;
            if (runT(run, p) > runT(run, hi)) hi = p;
          }
          cuts.push({ lo, hi });
        }
      }
      cuts.sort((p, q) => runT(run, p.lo) - runT(run, q.lo));
      let cur = run.a;
      for (const cut of cuts) {
        if (runT(run, cut.lo) > runT(run, cur)) {
          result.push({ a: cur, b: cut.lo });
        }
        if (runT(run, cut.hi) > runT(run, cur)) {
          cur = cut.hi;
        }
      }
      if (runT(run, run.b) > runT(run, cur)) {
        result.push({ a: cur, b: run.b });
      }
    }
    return result;
  }

  /** 构造并自检一个房间（性质 1、2 及窗的自身合法性），不触碰状态。 */
  private buildRoom(id: string, polygon: Point[], windows: WindowSeg[]): Room {
    const poly = polygon.map((p) => ({ x: p.x, y: p.y }));
    validateSimplePolygon(poly);
    if (!insideLot(poly, this.W, this.D)) {
      throw new FloorPlanError('OUTSIDE_LOT', `room '${id}' is not inside the lot`);
    }
    const runs = boundaryRuns(poly);
    const wins = windows.map((w) => ({ a: { x: w.a.x, y: w.a.y }, b: { x: w.b.x, y: w.b.y } }));
    for (const w of wins) {
      validateWindow(w, runs);
    }
    // 同一房间内窗与窗不允许正长度重合
    for (let i = 0; i < wins.length; i++) {
      for (let j = i + 1; j < wins.length; j++) {
        if (collinearOverlapPositive(wins[i].a, wins[i].b, wins[j].a, wins[j].b)) {
          throw new FloorPlanError('WINDOW_CONFLICT', `windows of room '${id}' overlap each other`);
        }
      }
    }
    const tris = triangulate(poly).map(([i, j, k]) => [poly[i], poly[j], poly[k]]);
    return { id, poly, windows: wins, tris, bbox: bboxOf(poly), runs };
  }

  /** 候选房间与所有其他房间（排除 excludeId）做性质 3、4 检查。 */
  private checkAgainstOthers(room: Room, excludeId: string): void {
    for (const other of this.rooms.values()) {
      if (other.id === excludeId) continue;
      if (!bboxOverlap(room.bbox, other.bbox)) continue;
      // 性质 3：内部不相交
      if (trisInteriorOverlap(room.tris, other.tris)) {
        throw new FloorPlanError('OVERLAP', `room '${room.id}' overlaps room '${other.id}'`, other.id);
      }
      // 性质 4：候选房间的窗 vs 对方边界
      for (const w of room.windows) {
        for (const [c, d] of edgesOf(other.poly)) {
          if (collinearOverlapPositive(w.a, w.b, c, d)) {
            throw new FloorPlanError(
              'WINDOW_CONFLICT',
              `window of room '${room.id}' coincides with boundary of room '${other.id}'`,
              other.id,
            );
          }
        }
      }
      // 性质 4：对方的窗 vs 候选房间边界
      for (const w of other.windows) {
        for (const [c, d] of edgesOf(room.poly)) {
          if (collinearOverlapPositive(w.a, w.b, c, d)) {
            throw new FloorPlanError(
              'WINDOW_CONFLICT',
              `boundary of room '${room.id}' covers window of room '${other.id}'`,
              other.id,
            );
          }
        }
      }
    }
  }
}

/** 沿线段 run 方向的单调参数（整数，用于排序比较；不用于重建坐标）。 */
function runT(run: Run, p: Point): number {
  const dx = run.b.x - run.a.x;
  const dy = run.b.y - run.a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? p.x - run.a.x : run.a.x - p.x;
  }
  return dy > 0 ? p.y - run.a.y : run.a.y - p.y;
}

/** 窗必须是正长度整数端点线段，且落在某条极大共线边界段上（可跨冗余顶点）。 */
function validateWindow(w: WindowSeg, runs: Run[]): void {
  for (const p of [w.a, w.b]) {
    if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) {
      throw new FloorPlanError('INVALID_WINDOW', 'window endpoints must be integers');
    }
  }
  if (w.a.x === w.b.x && w.a.y === w.b.y) {
    throw new FloorPlanError('INVALID_WINDOW', 'zero-length window');
  }
  for (const run of runs) {
    if (
      orient(run.a, run.b, w.a) === 0 &&
      orient(run.a, run.b, w.b) === 0 &&
      onSegment(run.a, run.b, w.a) &&
      onSegment(run.a, run.b, w.b)
    ) {
      return;
    }
  }
  throw new FloorPlanError('WINDOW_OFF_BOUNDARY', 'window is not on a single straight boundary segment');
}
