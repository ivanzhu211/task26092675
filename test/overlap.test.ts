import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FloorPlan } from '../src/floorplan';
import { FloorPlanError } from '../src/types';

const LOT = 1000;

function sq(x0: number, y0: number, x1: number, y1: number) {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

test('整面共墙：接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10));
  fp.addRoom('B', sq(10, 0, 20, 10));
  assert.equal(fp.exteriorSegments('A').length, 3);
});

test('部分共墙：接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 20, 10));
  fp.addRoom('B', sq(5, 10, 15, 20));
});

test('只在一个点相接：接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10));
  fp.addRoom('B', sq(10, 10, 20, 20));
});

test('房间嵌进另一个的凹口并共用三面墙：接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  // U 形（凹口朝上）：外框 [0,30]x[0,20]，凹口 [10,20]x[10,20]
  fp.addRoom('U', [
    { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 20, y: 20 },
    { x: 20, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 20 }, { x: 0, y: 20 },
  ]);
  // 正好嵌进凹口，共用三面墙
  fp.addRoom('N', sq(10, 10, 20, 20));
  // U 的 exterior 不应包含凹口三面
  const ext = fp.exteriorSegments('U');
  const has = (x0: number, y0: number, x1: number, y1: number) =>
    ext.some((s) => s.a.x === x0 && s.a.y === y0 && s.b.x === x1 && s.b.y === y1);
  assert.ok(!has(20, 20, 20, 10) && !has(20, 10, 10, 10) && !has(10, 10, 10, 20));
});

test('两个房间完全重合：拒绝 OVERLAP', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10));
  assert.throws(() => fp.addRoom('B', sq(0, 0, 10, 10)), (e: unknown) => {
    const err = e as FloorPlanError;
    assert.equal(err.code, 'OVERLAP');
    assert.equal(err.otherRoomId, 'A');
    return true;
  });
});

test('一个房间在另一个内部且共用若干条边：拒绝', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10));
  // 内部小房间，底边和左边贴在 A 的边界上
  assert.throws(() => fp.addRoom('B', sq(0, 0, 5, 5)), (e: unknown) => {
    assert.equal((e as FloorPlanError).code, 'OVERLAP');
    return true;
  });
});

test('两个矩形十字交叉：拒绝', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 4, 20, 8));
  assert.throws(() => fp.addRoom('B', sq(8, 0, 12, 20)), (e: unknown) => {
    assert.equal((e as FloorPlanError).code, 'OVERLAP');
    return true;
  });
});

test('凹多边形 + 斜边 + 顺时针/逆时针：接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  const ccw = [
    { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }, { x: 15, y: 15 }, { x: 0, y: 30 },
  ];
  const cw = [...ccw].reverse().map((p) => ({ x: p.x + 40, y: p.y }));
  fp.addRoom('A', ccw);
  fp.addRoom('B', cw);
});

test('斜边房间与斜边房间贴边（共斜墙）：接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]);
  fp.addRoom('B', [{ x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
});

test('拒绝后状态完全不变', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10));
  const before = JSON.stringify(fp.exteriorSegments('A'));
  assert.throws(() => fp.addRoom('B', sq(5, 5, 15, 15)));
  assert.throws(() => fp.updateRoom('A', sq(0, 0, 2000, 10))); // 出地块
  assert.equal(JSON.stringify(fp.exteriorSegments('A')), before);
  // A 仍然可以用原多边形 update
  fp.updateRoom('A', sq(0, 0, 10, 10));
});
