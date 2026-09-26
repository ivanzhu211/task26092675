import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FloorPlan } from '../src/floorplan';
import { Point, WindowSeg } from '../src/types';

test('1000 个 64 顶点房间紧密铺满：逐个 addRoom 总耗时 < 5s', () => {
  const COLS = 40;
  const ROWS = 25;
  const CELL = 1024; // 每边 16 等分 -> 64 顶点
  const fp = new FloorPlan(COLS * CELL, ROWS * CELL);

  const roomPoly = (cx: number, cy: number): Point[] => {
    const x0 = cx * CELL;
    const y0 = cy * CELL;
    const x1 = x0 + CELL;
    const y1 = y0 + CELL;
    const pts: Point[] = [];
    const step = CELL / 16;
    for (let i = 0; i < 16; i++) pts.push({ x: x0 + i * step, y: y0 });
    for (let i = 0; i < 16; i++) pts.push({ x: x1, y: y0 + i * step });
    for (let i = 0; i < 16; i++) pts.push({ x: x1 - i * step, y: y1 });
    for (let i = 0; i < 16; i++) pts.push({ x: x0, y: y1 - i * step });
    return pts;
  };

  // 靠外墙的房间带一扇外墙窗，同时锻炼窗检查
  const roomWindows = (cx: number, cy: number): WindowSeg[] => {
    const x0 = cx * CELL;
    const y0 = cy * CELL;
    const wins: WindowSeg[] = [];
    if (cy === 0) wins.push({ a: { x: x0 + 100, y: y0 }, b: { x: x0 + 900, y: y0 } });
    if (cy === ROWS - 1) wins.push({ a: { x: x0 + 100, y: y0 + CELL }, b: { x: x0 + 900, y: y0 + CELL } });
    if (cx === 0) wins.push({ a: { x: x0, y: y0 + 100 }, b: { x: x0, y: y0 + 900 } });
    if (cx === COLS - 1) wins.push({ a: { x: x0 + CELL, y: y0 + 100 }, b: { x: x0 + CELL, y: y0 + 900 } });
    return wins;
  };

  const t0 = process.hrtime.bigint();
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      fp.addRoom(`r${cx}_${cy}`, roomPoly(cx, cy), roomWindows(cx, cy));
    }
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`  1000 rooms x 64 vertices: total addRoom ${ms.toFixed(0)} ms`);
  assert.ok(ms < 5000, `too slow: ${ms} ms`);

  // 抽查一个内部房间的 exteriorSegments：四墙全部共墙 -> 空
  assert.deepEqual(fp.exteriorSegments('r20_12'), []);
  // 角上房间：两条外墙
  assert.equal(fp.exteriorSegments('r0_0').length, 2);
});
