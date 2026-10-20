import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  extent,
  linear,
  niceStep,
  niceTicks,
  padDomain,
  timeStep,
  timeTicks,
} from './scale.ts';

test('extent: 忽略 null / NaN / Infinity，全空返回 null', () => {
  assert.deepEqual(extent([1, null, 3, 2]), [1, 3]);
  assert.deepEqual(extent([NaN, 5, Infinity, -2]), [-2, 5]);
  assert.equal(extent([]), null);
  assert.equal(extent([null, null]), null);
});

test('niceStep: 步长只会是 1/2/2.5/5 × 10^k', () => {
  const cases: Array<[number, number]> = [
    [0.9, 1],
    [1.3, 2],
    [2.2, 2.5],
    [4, 5],
    [7, 10],
    [30, 50],
    [120, 200],
  ];
  for (const [raw, want] of cases) {
    assert.equal(niceStep(raw), want, `niceStep(${raw})`);
  }
  // 非法输入兜底
  assert.equal(niceStep(0), 1);
  assert.equal(niceStep(-5), 1);
  assert.equal(niceStep(NaN), 1);
});

test('niceTicks: 升序、去重、覆盖范围、步长整齐', () => {
  const ticks = niceTicks(0, 100, 5);
  assert.ok(ticks.length >= 3, `点数太少: ${ticks}`);
  assert.deepEqual(ticks, [...ticks].sort((a, b) => a - b));
  assert.equal(new Set(ticks).size, ticks.length);
  assert.ok(ticks[0] >= 0 && ticks[ticks.length - 1] <= 100);
  // 相邻间隔一致
  const gaps = ticks.slice(1).map((v, i) => v - ticks[i]);
  for (const g of gaps) assert.ok(Math.abs(g - gaps[0]) < 1e-9, `间隔不均: ${gaps}`);
});

test('niceTicks: min === max 不产生 NaN、给对称区间', () => {
  const ticks = niceTicks(5, 5, 4);
  assert.ok(ticks.length >= 2);
  for (const t of ticks) assert.ok(Number.isFinite(t));
});

test('niceTicks: 反向输入自动纠正', () => {
  const a = niceTicks(100, 0, 4);
  const b = niceTicks(0, 100, 4);
  assert.deepEqual(a, b);
});

test('niceTicks: 浮点尾巴被收敛', () => {
  const ticks = niceTicks(0, 1, 4);
  for (const t of ticks) {
    assert.equal(t, Number(t.toPrecision(12)));
    assert.ok(Number.isFinite(t));
  }
});

test('linear: 两端点精确、跨零、零跨度不产生 NaN', () => {
  const m = linear([0, 10], [0, 100]);
  assert.equal(m(0), 0);
  assert.equal(m(10), 100);
  assert.equal(m(5), 50);

  const neg = linear([-1, 1], [0, 100]);
  assert.equal(neg(-1), 0);
  assert.equal(neg(1), 100);

  const flat = linear([5, 5], [10, 200]);
  assert.equal(flat(5), 10);
  assert.ok(Number.isFinite(flat(999)));
});

test('padDomain: 等值数据也给出非零区间', () => {
  const [lo, hi] = padDomain([3, 3]);
  assert.ok(hi > lo);
  const [a, b] = padDomain([0, 100], 0.1);
  assert.equal(a, -10);
  assert.equal(b, 110);
});

test('timeStep: 落在预置的整齐步长上', () => {
  assert.equal(timeStep(0, 60, 4), 15);
  assert.equal(timeStep(0, 3600, 4), 900);
  assert.equal(timeStep(0, 86400, 4), 21600);
  // 极长跨度也要有步长（不返回 undefined）
  assert.ok(timeStep(0, 86400 * 365, 4) > 0);
});

test('timeTicks: 对齐步长、升序、不越界', () => {
  const from = 1_792_000_050; // 非整点，验证向上对齐
  const to = from + 3600;
  const ticks = timeTicks(from, to, 4);
  assert.ok(ticks.length >= 3);
  for (const t of ticks) {
    assert.ok(t >= from && t <= to, `越界: ${t}`);
    assert.equal(t % timeStep(from, to, 4), 0, `未对齐: ${t}`);
  }
  assert.deepEqual(ticks, [...ticks].sort((a, b) => a - b));
});

test('timeTicks: 非法区间返回空数组', () => {
  assert.deepEqual(timeTicks(100, 100), []);
  assert.deepEqual(timeTicks(200, 100), []);
  assert.deepEqual(timeTicks(NaN, 100), []);
});

test('clamp: NaN 归到下界', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
  assert.equal(clamp(NaN, 2, 10), 2);
});
