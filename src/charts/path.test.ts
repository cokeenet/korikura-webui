import { test } from 'node:test';
import assert from 'node:assert/strict';

import { areaPath, countPoints, linePath, singlePoint, sparkPath } from './path.ts';

test('linePath: 连续点用 M + L 递进', () => {
  const d = linePath([
    { x: 0, y: 0 },
    { x: 10, y: 5 },
    { x: 20, y: 0 },
  ]);
  assert.equal(d, 'M0 0L10 5L20 0');
});

test('linePath: null 断线，重新 M 起段', () => {
  const d = linePath([
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    null,
    { x: 2, y: 2 },
    { x: 3, y: 3 },
  ]);
  assert.equal(d, 'M0 0L1 1M2 2L3 3');
  assert.ok(!d.includes('L2 2'), '断点后不应继续用 L');
});

test('linePath: 全空返回空串（调用方据此显示空态）', () => {
  assert.equal(linePath([null, null]), '');
  assert.equal(linePath([]), '');
});

test('linePath: 坐标四舍五入到 2 位，不出现长尾浮点', () => {
  const d = linePath([{ x: 1 / 3, y: 2 / 3 }]);
  assert.equal(d, 'M0.33 0.67');
});

test('areaPath: 每段独立闭合，断点处不横穿', () => {
  const d = areaPath(
    [{ x: 0, y: 10 }, { x: 10, y: 10 }, null, { x: 20, y: 10 }, { x: 30, y: 10 }],
    100,
  );
  // 两段各自 M...Z
  assert.equal((d.match(/M/g) || []).length, 2, `应有 2 段: ${d}`);
  assert.equal((d.match(/Z/g) || []).length, 2);
  // 段首是 `M<首点x> <基线y>`，随后 L 到各数据点，最后回基线 Z
  assert.ok(d.startsWith('M0 100'), `应从基线起笔: ${d}`);
  assert.ok(d.includes('L10 10'), '应连到数据点');
});

test('areaPath: 全空返回空串', () => {
  assert.equal(areaPath([null, null], 50), '');
});

test('countPoints: 统计有效点', () => {
  assert.equal(countPoints([null, { x: 0, y: 0 }, null, { x: 1, y: 1 }]), 2);
  assert.equal(countPoints([]), 0);
});

test('sparkPath: 归一化到给定宽高内', () => {
  const d = sparkPath([1, 2, 3, 4], 100, 20);
  assert.ok(d.startsWith('M'));
  const coords = [...d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
  assert.equal(coords.length, 4);
  for (const c of coords) {
    assert.ok(c.x >= 0 && c.x <= 100, `x 越界: ${c.x}`);
    assert.ok(c.y >= 0 && c.y <= 20, `y 越界: ${c.y}`);
  }
  // 最小值应贴底（y 大），最大值贴顶（y 小）
  assert.ok(coords[0].y > coords[3].y, '上升序列应该往上走');
});

test('sparkPath: 等值数据画中线（不贴边、不除零）', () => {
  const d = sparkPath([7, 7, 7], 100, 20);
  const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
  assert.ok(ys.every((y) => y === 10), `应全在中线: ${ys}`);
});

test('sparkPath: null 断线且不参与极值计算', () => {
  const d = sparkPath([100, null, 200], 100, 20);
  assert.ok(d.includes('M'), '第一段');
  assert.equal((d.match(/M/g) || []).length, 2, `应有两段: ${d}`);
});

test('sparkPath: 空/单点/非法尺寸返回空串', () => {
  assert.equal(sparkPath([], 100, 20), '');
  assert.equal(sparkPath([null, null], 100, 20), '');
  assert.equal(sparkPath([1], 0, 20), '');
  assert.equal(sparkPath([1], 100, -1), '');
});

test('singlePoint: 只有 1 个有效点时给出坐标', () => {
  const p = singlePoint([null, 5, null], 100, 20);
  assert.ok(p);
  assert.ok(p!.x > 0 && p!.x < 100);
  // 多于 1 个点就不该用这个函数
  assert.equal(singlePoint([1, 2], 100, 20), null);
  assert.equal(singlePoint([null], 100, 20), null);
});
