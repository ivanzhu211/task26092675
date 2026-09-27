# task26092675

单层住宅平面几何校验库（TypeScript / Node，纯内存，无持久化）。

## 使用

```ts
import { FloorPlan } from './src/floorplan';

const fp = new FloorPlan(1_000_000, 1_000_000); // 地块 [0,W]x[0,D]，单位 1/16 英寸
fp.addRoom('living', [
  { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 },
], [
  { a: { x: 10, y: 0 }, b: { x: 30, y: 0 } }, // 窗：必须落在本房间边界上
]);
fp.updateRoom('living', polygon2, windows2);
fp.removeRoom('living');
fp.exteriorSegments('living'); // 不与其他房间边界重合的外墙段（共线相邻已合并）
```

## 不变式（每个被接受的操作之后都成立）

1. 多边形合法：面积非零、无零长边、非相邻边无公共点、相邻边仅共享端点（允许共线冗余顶点）。
2. 房间在地块内（贴边可以）。
3. 任意两房间内部不相交（共墙、点接触、凹口嵌套允许；重合、内含、交叉拒绝）。
4. 窗与任何其他房间边界无正长度重合；同一房间的窗彼此亦无。新增/移动房间压住已有窗同样拒绝。

违反即整体拒绝、状态不变，并抛出带 `code` 的 `FloorPlanError` 子类：
`InvalidPolygonError`、`OutOfBoundsError`、`RoomOverlapError`（含 `otherId`）、
`WindowConflictError`（含 `otherId`）、`InvalidWindowError`、
`DuplicateRoomError`、`RoomNotFoundError`。

## 精确性

全部判定为精确整数运算：坐标 ≤ 1e6，叉积 ≤ 2e12，普通 `number` 即可精确表示；
边的交点等有理数量用 BigInt 分数表示。无浮点容差、无栅格化、无采样。

## 构建与测试

```sh
npm run build   # tsc -p tsconfig.json（输出到 dist/）
npm test        # 构建并运行 dist/test 下全部测试
```

测试覆盖：性质 3 列出的全部情形、跨共墙/外墙分界点的窗、带窗墙外侧贴新房间且
`exteriorSegments` 不变、小坐标随机房间与暴力参照实现逐一比对，以及
1000 个 64 顶点房间紧密铺满时逐个 `addRoom` 总耗时 < 5 秒（实测约 0.7 秒）。
