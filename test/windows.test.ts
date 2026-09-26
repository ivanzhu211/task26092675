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

function codeOf(fn: () => void): string {
  try {
    fn();
  } catch (e) {
    return (e as FloorPlanError).code;
  }
  throw new Error('expected to throw');
}

test('窗跨过共墙段与外墙段的分界点：拒绝；完全在外墙段内：接受', () => {
  // A = [0,20]x[0,10]，B 将贴在其顶边中段 [5,15]
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 20, 10), [{ a: { x: 3, y: 10 }, b: { x: 8, y: 10 } }]);
  // B 贴上来后，A 的窗 [3,8] 与 B 的边界 [5,15] 在 [5,8] 上重合 -> 拒绝 B
  assert.equal(codeOf(() => fp.addRoom('B', sq(5, 10, 15, 20))), 'WINDOW_CONFLICT');
  // 改成完全落在外墙段的窗，再贴 B -> 接受
  fp.updateRoom('A', sq(0, 0, 20, 10), [{ a: { x: 16, y: 10 }, b: { x: 19, y: 10 } }]);
  fp.addRoom('B', sq(5, 10, 15, 20));
});

test('窗恰好终止于共墙分界点（只碰一个点）：接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 20, 10), [{ a: { x: 1, y: 10 }, b: { x: 5, y: 10 } }]);
  fp.addRoom('B', sq(5, 10, 15, 20));
});

test('在带窗的墙外侧贴新房间：拒绝，且 exteriorSegments 不变', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10), [{ a: { x: 2, y: 10 }, b: { x: 8, y: 10 } }]);
  const before = JSON.stringify(fp.exteriorSegments('A'));
  const err = codeOf(() => fp.addRoom('C', sq(0, 10, 10, 20)));
  assert.equal(err, 'WINDOW_CONFLICT');
  assert.equal(JSON.stringify(fp.exteriorSegments('A')), before);
});

test('压窗错误带对方房间 id', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10), [{ a: { x: 2, y: 10 }, b: { x: 8, y: 10 } }]);
  assert.throws(() => fp.addRoom('C', sq(0, 10, 10, 20)), (e: unknown) => {
    assert.equal((e as FloorPlanError).otherRoomId, 'A');
    return true;
  });
});

test('同房间两窗正长度重合：拒绝；只碰端点：接受', () => {
  const fp = new FloorPlan(LOT, LOT);
  assert.equal(
    codeOf(() =>
      fp.addRoom('A', sq(0, 0, 10, 10), [
        { a: { x: 1, y: 0 }, b: { x: 5, y: 0 } },
        { a: { x: 4, y: 0 }, b: { x: 8, y: 0 } },
      ]),
    ),
    'WINDOW_CONFLICT',
  );
  fp.addRoom('B', sq(0, 0, 10, 10), [
    { a: { x: 1, y: 0 }, b: { x: 5, y: 0 } },
    { a: { x: 5, y: 0 }, b: { x: 8, y: 0 } },
  ]);
});

test('窗不在边界上 / 跨非共线两边 / 零长 / 非整数端点：拒绝', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10));
  // 不在边界直线上
  assert.equal(codeOf(() => fp.updateRoom('A', sq(0, 0, 10, 10), [{ a: { x: 2, y: 5 }, b: { x: 8, y: 5 } }])), 'WINDOW_OFF_BOUNDARY');
  // 共线但超出边界段
  assert.equal(codeOf(() => fp.updateRoom('A', sq(0, 0, 10, 10), [{ a: { x: 8, y: 0 }, b: { x: 12, y: 0 } }])), 'WINDOW_OFF_BOUNDARY');
  // 跨过拐角（两段不共线）
  assert.equal(codeOf(() => fp.updateRoom('A', sq(0, 0, 10, 10), [{ a: { x: 8, y: 0 }, b: { x: 10, y: 2 } }])), 'WINDOW_OFF_BOUNDARY');
  // 零长
  assert.equal(codeOf(() => fp.updateRoom('A', sq(0, 0, 10, 10), [{ a: { x: 5, y: 0 }, b: { x: 5, y: 0 } }])), 'INVALID_WINDOW');
  // 非整数端点
  assert.equal(codeOf(() => fp.updateRoom('A', sq(0, 0, 10, 10), [{ a: { x: 2.5, y: 0 }, b: { x: 8, y: 0 } }])), 'INVALID_WINDOW');
});

test('窗可以跨过共线冗余顶点', () => {
  const fp = new FloorPlan(LOT, LOT);
  // 底边带冗余中点 (5,0)
  const poly = [
    { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 10 }, { x: 0, y: 10 },
  ];
  fp.addRoom('A', poly, [{ a: { x: 2, y: 0 }, b: { x: 8, y: 0 } }]);
  // exterior 底边应合并为一条
  const ext = fp.exteriorSegments('A');
  assert.ok(ext.some((s) => s.a.x === 0 && s.a.y === 0 && s.b.x === 10 && s.b.y === 0));
});

test('斜墙上的窗：接受；被斜边房间压住：拒绝', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }], [
    { a: { x: 2, y: 8 }, b: { x: 5, y: 5 } },
  ]);
  // B 与 A 共斜墙 -> 压住 A 的斜窗
  assert.equal(
    codeOf(() => fp.addRoom('B', [{ x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])),
    'WINDOW_CONFLICT',
  );
});

test('updateRoom 移动到压住别人窗的位置：拒绝且状态不变', () => {
  const fp = new FloorPlan(LOT, LOT);
  fp.addRoom('A', sq(0, 0, 10, 10), [{ a: { x: 2, y: 10 }, b: { x: 8, y: 10 } }]);
  fp.addRoom('M', sq(30, 30, 40, 40));
  const beforeA = JSON.stringify(fp.exteriorSegments('A'));
  const beforeM = JSON.stringify(fp.exteriorSegments('M'));
  assert.equal(codeOf(() => fp.updateRoom('M', sq(0, 10, 10, 20))), 'WINDOW_CONFLICT');
  assert.equal(JSON.stringify(fp.exteriorSegments('A')), beforeA);
  assert.equal(JSON.stringify(fp.exteriorSegments('M')), beforeM);
  // 挪到不压窗的位置则接受
  fp.updateRoom('M', sq(20, 0, 30, 10));
});
