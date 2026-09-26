import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FloorPlan } from '../src/floorplan';

const LOT = 1000;

function sq(x0: number, y0: number, x1: number, y1: number) {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

test('一面墙被两个邻居分段覆盖：exterior 剩两段', () => {
  const fp = new FloorPlan(LOT, LOT);
  // A 顶边 y=10, x in [0,30]；B 覆盖 [0,10]，C 覆盖 [20,30]，中间 [10,20] 外露
  fp.addRoom('A', sq(0, 0, 30, 10));
  fp.addRoom('B', sq(0, 10, 10, 20));
  fp.addRoom('C', sq(20, 10, 30, 20));
  const ext = fp.exteriorSegments('A');
  // 顶边只有中段 [10,20] 外露
  assert.deepEqual(ext, [
    { a: { x: 0, y: 0 }, b: { x: 30, y: 0 } },
    { a: { x: 30, y: 0 }, b: { x: 30, y: 10 } },
    { a: { x: 20, y: 10 }, b: { x: 10, y: 10 } },
    { a: { x: 0, y: 10 }, b: { x: 0, y: 0 } },
  ]);
});

test('点接触不削去边界', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10));
  fp.addRoom('B', sq(10, 10, 20, 20)); // 只在 (10,10) 接触
  assert.equal(fp.exteriorSegments('A').length, 4);
});

test('冗余共线顶点合并 + 跨 0 号顶点合并', () => {
  const fp = new FloorPlan(LOT, LOT);
  // 底边跨 0 号顶点共线：最后一个点和前两个点共线
  fp.addRoom('A', [
    { x: 5, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
    { x: 0, y: 0 },
  ]);
  const ext = fp.exteriorSegments('A');
  assert.equal(ext.length, 4);
  assert.ok(ext.some((s) => s.a.x === 0 && s.a.y === 0 && s.b.x === 10 && s.b.y === 0));
});

test('斜墙部分重合：exterior 只剩未重合段', () => {
  const fp = new FloorPlan(LOT, LOT);
  // A 的斜边 x+y=20 上，B 只覆盖其中 (10,10)-(20,0) 一段
  fp.addRoom('A', [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 20 }]);
  fp.addRoom('B', [{ x: 20, y: 0 }, { x: 20, y: 20 }, { x: 10, y: 10 }]);
  const ext = fp.exteriorSegments('A');
  // 斜边只有 (10,10)-(0,20) 段外露
  assert.deepEqual(ext, [
    { a: { x: 0, y: 0 }, b: { x: 20, y: 0 } },
    { a: { x: 10, y: 10 }, b: { x: 0, y: 20 } },
    { a: { x: 0, y: 20 }, b: { x: 0, y: 0 } },
  ]);
});

test('updateRoom 后 exteriorSegments 随之更新', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10));
  fp.addRoom('B', sq(10, 0, 20, 10));
  assert.equal(fp.exteriorSegments('A').length, 3);
  fp.updateRoom('B', sq(30, 0, 40, 10)); // 挪走
  assert.equal(fp.exteriorSegments('A').length, 4);
  fp.removeRoom('B');
  assert.equal(fp.exteriorSegments('A').length, 4);
});
