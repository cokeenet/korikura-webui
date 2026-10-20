/**
 * SVG 路径构造 —— 纯函数。
 *
 * 只做一件事：把「数据点序列」变成 `<path d="...">` 字符串。
 * **空点（`null`）必须断线**，不能连过去：连过去等于凭空造了一段趋势，
 * 而那段恰好是采集失败的时间 —— 会让人误判成「指标平稳」。
 */
import type { MaybeNumber } from './scale.ts';

/** 屏幕坐标点。 */
export interface Pt {
  x: number;
  y: number;
}

/** 保留 2 位小数：路径够精确，又避免 `12.000000000000002` 这种噪声。 */
function n(v: number): string {
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '0';
}

/**
 * 折线路径。`null` 断开（`M` 起新段）。
 *
 * 只有一个点时不画线（`<path>` 单点不可见），返回空串 ——
 * 调用方应改用 `<circle>` 标点（`hasSinglePoint` 可判断）。
 */
export function linePath(points: readonly (Pt | null)[]): string {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`;
    pen = true;
  }
  return d;
}

/**
 * 面积路径：折线 + 回到基线闭合。
 *
 * 断点处要**分别闭合**每一段，否则会横穿空档连成一片。
 */
export function areaPath(points: readonly (Pt | null)[], baselineY: number): string {
  let d = '';
  let seg: Pt[] = [];
  const flush = () => {
    if (seg.length === 0) return;
    const first = seg[0];
    const last = seg[seg.length - 1];
    // 起点下到基线 → 走完 → 终点回基线 → 闭合
    d += `M${n(first.x)} ${n(baselineY)}`;
    for (const p of seg) d += `L${n(p.x)} ${n(p.y)}`;
    d += `L${n(last.x)} ${n(baselineY)}Z`;
    seg = [];
  };
  for (const p of points) {
    if (p) seg.push(p);
    else flush();
  }
  flush();
  return d;
}

/** 有效点数量（判断「只有 1 个点」这类边界）。 */
export function countPoints(points: readonly (Pt | null)[]): number {
  let c = 0;
  for (const p of points) if (p) c++;
  return c;
}

/**
 * 迷你折线（sparkline）路径。
 *
 * 自动按 values 的实际范围归一化到 `[0, w] × [0, h]`；
 * 全空 → 空串（调用方显示空态）。全等值 → 画中线（一条直线比贴边好看）。
 *
 * `pad` 是像素内边距，默认 1，避免描边被 viewBox 裁掉。
 */
export function sparkPath(
  values: readonly MaybeNumber[],
  w: number,
  h: number,
  pad = 1,
): string {
  const valid: number[] = [];
  for (const v of values) if (v !== null && Number.isFinite(v)) valid.push(v);
  if (valid.length === 0 || w <= 0 || h <= 0) return '';

  const iw = Math.max(0, w - pad * 2);
  const ih = Math.max(0, h - pad * 2);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const span = max - min;
  const stepX = values.length > 1 ? iw / (values.length - 1) : 0;

  const yOf = (v: number): number => {
    if (span === 0) return pad + ih / 2; // 等值：画中线
    // SVG y 轴向下，所以要翻转
    return pad + ih - ((v - min) / span) * ih;
  };

  const pts: (Pt | null)[] = values.map((v, i) =>
    v === null || !Number.isFinite(v)
      ? null
      : { x: pad + i * stepX, y: yOf(v) },
  );
  return linePath(pts);
}

/** 给单一数据点画圆（折线画不出来的情况）。返回 [x, y] 或 null。 */
export function singlePoint(
  values: readonly MaybeNumber[],
  w: number,
  h: number,
  pad = 1,
): Pt | null {
  const valid: number[] = [];
  const idx: number[] = [];
  values.forEach((v, i) => {
    if (v !== null && Number.isFinite(v)) {
      valid.push(v);
      idx.push(i);
    }
  });
  if (valid.length !== 1 || w <= 0 || h <= 0) return null;
  const iw = Math.max(0, w - pad * 2);
  const stepX = values.length > 1 ? iw / (values.length - 1) : 0;
  return { x: pad + idx[0] * stepX, y: pad + Math.max(0, h - pad * 2) / 2 };
}
