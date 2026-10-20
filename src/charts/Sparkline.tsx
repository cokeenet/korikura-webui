/**
 * 迷你折线（sparkline）—— 用于指标卡里的一行趋势。
 *
 * ## 为什么是 .tsx 而没有 .astro 孪生
 *
 * 孪生规则（BEST-PRACTICES §七）针对的是「同一个原语既要在 SSR 页、
 * 又要在 React 岛屿里用」的情况。图表组件是**纯 props → 纯标记**、
 * 不含任何 hook 或状态，在 `.astro` 里直接写 `<Sparkline … />`（不加
 * `client:*`）时 Astro 会把它**静态渲染成 HTML**，不向客户端发 JS。
 * 因此不需要也不能有两份实现（两份必然漂移）。
 *
 * 约束（写新图表时同样适用）：
 *   · 不 import 任何 hook；不读 `Date.now()` / `Math.random()`
 *   · 所有尺寸用 viewBox 推导，不依赖测量 DOM
 */
import type { MaybeNumber } from './scale.ts';
import { singlePoint, sparkPath } from './path.ts';

export type ChartTone = 'primary' | 'ok' | 'warn' | 'danger' | 'muted';

const TONE_VAR: Record<ChartTone, string> = {
  primary: 'var(--primary)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  muted: 'var(--muted)',
};

export interface SparklineProps {
  values: readonly MaybeNumber[];
  /** 高度（px，CSS 用）。宽度始终 100%。 */
  height?: number;
  tone?: ChartTone;
  /** 是否填充曲线下方（面积）。指标卡里通常开。 */
  fill?: boolean;
  /** 无障碍描述；默认「趋势图」。 */
  ariaLabel?: string;
  className?: string;
}

/**
 * 设计宽度 240：实际显示宽度由容器决定，SVG 等比缩放。
 * 用固定 viewBox 而不是测量 DOM，才能在 SSR 阶段就画出完整图形。
 */
const W = 240;
const PAD = 1;

export default function Sparkline({
  values,
  height = 40,
  tone = 'primary',
  fill = true,
  ariaLabel = '趋势图',
  className,
}: SparklineProps) {
  const h = Math.max(8, height);
  const color = TONE_VAR[tone] ?? TONE_VAR.primary;
  const d = sparkPath(values, W, h, PAD);
  const dot = singlePoint(values, W, h, PAD);
  const empty = d === '' && !dot;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {empty ? (
        // 没有数据时画一条虚线基线：明确是「没数据」，不是「值为 0」
        <line
          x1={0}
          y1={h / 2}
          x2={W}
          y2={h / 2}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {fill && d ? (
        <path
          d={`${d}L${W - PAD} ${h}L${PAD} ${h}Z`}
          fill={color}
          fillOpacity={0.12}
          stroke="none"
        />
      ) : null}

      {d ? (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {/* 只有一个有效点：画个圆点，否则什么都看不到 */}
      {dot ? <circle cx={dot.x} cy={dot.y} r={2} fill={color} /> : null}
    </svg>
  );
}
