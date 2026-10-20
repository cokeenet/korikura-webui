/**
 * 图表刻度与映射 —— **纯函数**，无 DOM / 无 React。
 *
 * 这一层是图表组件的「数学部分」：把数据域映射到像素域、算刻度。
 * 抽成纯函数的原因：
 *   · 可以单测（`node --test`，本项目零测试依赖）
 *   · SSR 与客户端岛屿共用同一份计算，不会出现「首屏和 hydration 后曲线不同」
 *   · 组件层只剩画 `<path>`，逻辑不散落在 JSX 里
 *
 * ⚠️ 约束：**不允许在这里读时间/随机数**。图表必须对同一输入产出同一输出，
 *    否则 SSR 结果与客户端重绘会不一致（水位不一致的典型成因）。
 */

/** 图表里普遍允许空点（采集缺失）。`null` 表示「这一轮没有数据」，不是 0。 */
export type MaybeNumber = number | null;

/** 取有效值的范围。全空/空数组 → `null`（调用方据此显示空态，而不是画一条 0 线）。 */
export function extent(values: readonly MaybeNumber[]): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) return null;
  return [min, max];
}

/** 把范围撑开到「好看的刻度」：保证刻度步长是 1/2/5 × 10^k。 */
export function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  // 1 / 2 / 2.5 / 5 / 10：加 2.5 是为了「0~100」这类范围出 25 的间隔
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return factor * mag;
}

/**
 * 在 [min, max] 上取约 `count` 个整齐刻度（含端点附近）。
 *
 * - `min === max` 时给一个围绕该值的三点刻度（否则除以 0）
 * - 返回值升序、去重
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (count < 2) count = 2;
  if (min > max) [min, max] = [max, min];

  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= pad;
    max += pad;
  }

  const step = niceStep((max - min) / (count - 1));
  const first = Math.ceil(min / step) * step;
  const out: number[] = [];
  // 用整数步进避免浮点累积误差（0.1 的经典问题）
  for (let k = 0; k < 1000; k++) {
    const v = first + k * step;
    if (v > max + step * 1e-9) break;
    // 收敛浮点尾巴：12.000000000000002 → 12
    out.push(Number(v.toPrecision(12)));
  }
  return out;
}

/** 线性映射：`domain` → `range`。domain 长度为 0 时返回 range 起点（不产生 NaN）。 */
export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  if (!Number.isFinite(span) || span === 0) return () => r0;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** 常见的「好看时间步长」（秒）。从 1 秒到 30 天。 */
const TIME_STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400,
  172800, 604800, 2592000,
];

/** 选一个能让 [from, to] 放下约 `count` 个刻度的时间步长（秒）。 */
export function timeStep(from: number, to: number, count = 4): number {
  const span = Math.max(1, to - from);
  const raw = span / Math.max(2, count);
  for (const s of TIME_STEPS) if (s >= raw) return s;
  return TIME_STEPS[TIME_STEPS.length - 1];
}

/**
 * 时间轴刻度（Unix 秒），按步长对齐到整点边界。
 *
 * 对齐用 `Math.ceil(from / step) * step`：Unix 时间戳天然按 UTC 对齐，
 * 本地时区偏移由展示层格式化时处理 —— 计算层不碰时区。
 */
export function timeTicks(from: number, to: number, count = 4): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  const step = timeStep(from, to, count);
  const first = Math.ceil(from / step) * step;
  const out: number[] = [];
  for (let t = first; t <= to; t += step) out.push(t);
  return out;
}

/** 夹在 [lo, hi] 之间；NaN → lo。 */
export function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * 给范围加一点上下留白（折线贴边很难看）。
 * `padding` 是比例的（0.08 = 上下各留 8%）。全 0 数据也会给一个对称区间。
 */
export function padDomain(
  domain: readonly [number, number],
  padding = 0.08,
): [number, number] {
  const [min, max] = domain;
  const span = max - min;
  if (span === 0) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    return [min - pad, max + pad];
  }
  const pad = span * padding;
  return [min - pad, max + pad];
}
