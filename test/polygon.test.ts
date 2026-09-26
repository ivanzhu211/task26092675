import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FloorPlan } from '../src/floorplan';
import { FloorPlanError } from '../src/types';

const LOT = 1000;

function codeOf(fn: () => void): string {
  try {
    fn();
  } catch (e) {
    return (e as FloorPlanError).code;
  }
  throw new Error('expected to throw');
}

test('性质 1：非法多边形逐一拒绝', () => {
  const fp = new FloorPlan(LOT, LOT);
  // 零面积（共线）
  assert.equal(codeOf(() => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }])), 'INVALID_POLYGON');
  // 零长边
  assert.equal(codeOf(() => fp.addRoom('b', [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }])), 'INVALID_POLYGON');
  // 非相邻边相交（8 字）
  assert.equal(codeOf(() => fp.addRoom('c', [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }])), 'INVALID_POLYGON');
  // 非相邻边只碰一个点（自触）也不行试试
  assert.equal(
    codeOf(() => fp.addRoom('d', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 0 }, { x: 0, y: 10 }])),
    'INVALID_POLYGON',
  );
  // 相邻边回折（尖刺）
  assert.equal(codeOf(() => fp.addRoom('e', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 10 }])), 'INVALID_POLYGON');
  // 少于 3 个顶点
  assert.equal(codeOf(() => fp.addRoom('f', [{ x: 0, y: 0 }, { x: 10, y: 0 }])), 'INVALID_POLYGON');
  // 非整数坐标
  assert.equal(codeOf(() => fp.addRoom('g', [{ x: 0, y: 0 }, { x: 10.5, y: 0 }, { x: 0, y: 10 }])), 'INVALID_POLYGON');
});

test('性质 1：共线冗余顶点、凹多边形、斜边、两个方向都接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('ok1', [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  fp.addRoom('ok2', [{ x: 20, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 10 }, { x: 25, y: 5 }, { x: 20, y: 10 }].reverse());
  fp.addRoom('ok3', [{ x: 40, y: 0 }, { x: 50, y: 3 }, { x: 45, y: 10 }]);
});

test('性质 2：出地块拒绝，贴边接受', () => {
  const fp = new FloorPlan(100, 100);
  assert.equal(codeOf(() => fp.addRoom('a', [{ x: 0, y: 0 }, { x: 101, y: 0 }, { x: 0, y: 10 }])), 'OUTSIDE_LOT');
  assert.equal(codeOf(() => fp.addRoom('b', [{ x: -1, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }])), 'OUTSIDE_LOT');
  fp.addRoom('c', [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
});

test('房间管理错误：重复 id / 未找到', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]);
  assert.equal(codeOf(() => fp.addRoom('A', [{ x: 20, y: 0 }, { x: 30, y: 0 }, { x: 20, y: 10 }])), 'DUPLICATE_ROOM');
  assert.equal(codeOf(() => fp.updateRoom('ZZ', [{ x: 20, y: 0 }, { x: 30, y: 0 }, { x: 20, y: 10 }])), 'ROOM_NOT_FOUND');
  assert.equal(codeOf(() => fp.removeRoom('ZZ')), 'ROOM_NOT_FOUND');
  assert.equal(codeOf(() => fp.exteriorSegments('ZZ')), 'ROOM_NOT_FOUND');
});
