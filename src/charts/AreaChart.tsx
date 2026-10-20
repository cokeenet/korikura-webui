/**
 * 多序列面积/折线图（SSR 静态渲染，无 JS）。
 *
 * ## 职责边界
 *
 * 只画「时间 → 数值」的曲线，不负责取数、不负责轮询。取数在页面（SSR 首次）
 * 或岛屿（若要实时刷新）里做，把 `series` 传进来即可。
 *
 * ## 为什么 viewBox 固定宽度
 *
 * 图表的宽度必须自适应容器，但**不能在服务端测量 DOM**。所以固定设计宽度
 * （默认 720），用 `width="100%"` 等比缩放。代价是窄屏时字号同比变小 ——
 * 这是管理面板（桌面为主）可接受的取舍，换来「首屏就有完整图形、零 JS」。
 *
 * ## 空值语义
 *
 * `null` = 该时刻没有采集到数据 → **断线**，并在图例里提示「有空档」。
 * 绝不插值：插值会凭空造出一段趋势，恰好掩盖采集失败。
 */
import type { MaybeNumber } from './scale.ts';
import { extent, linear, niceTicks, padDomain, timeTicks } from './scale.ts';
import { areaPath, linePath } from './path.ts';

export type ChartTone = 'primary' | 'ok' | 'warn' | 'danger' | 'muted';

const TONE_VAR: Record<ChartTone, string> = {
  primary: 'var(--primary)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  muted: 'var(--muted)',
};

export interface ChartSeries {
  /** 图例名 */
  name: string;
  /** 数据点，`null` 表示该时刻缺采 */
  points: readonly MaybeNumber[];
  /** 色调（走 CSS 变量）或直接给颜色（`var(--x)` / hex）。 */
  tone?: ChartTone;
  color?: string;
  /** 是否填充面积，默认 true。 */
  fill?: boolean;
}

export interface AreaChartProps {
  series: readonly ChartSeries[];
  height?: number;
  /** 设计宽度（容器更宽时等比放大）。 */
  width?: number;
  /** y 轴单位（贴在刻度值后），如 `%`、`°C`。 */
  yUnit?: string;
  /** 自定义 y 刻度格式化（优先于 yUnit）。 */
  yFormat?: (v: number) => string;
  /** 时间范围（Unix 秒）。给了才画时间轴刻度。 */
  from?: number;
  to?: number;
  /** y 轴从 0 起（百分比/容量类图表应开）。 */
  zeroBased?: boolean;
  showLegend?: boolean;
  ariaLabel?: string;
  className?: string;
}

const LEFT = 52; // y 轴标签区
const RIGHT = 10;
const TOP = 10;
const BOTTOM = 22; // x 轴标签区

export default function AreaChart({
  series,
  height = 200,
  width = 720,
  yUnit = '',
  yFormat,
  from,
  to,
  zeroBased = false,
  showLegend = true,
  ariaLabel = '趋势图',
  className,
}: AreaChartProps) {
  const W = Math.max(320, width);
  const H = Math.max(80, height);
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;

  // 所有序列共用一条 y 轴：跨序列比高低才有意义
  const all = series.flatMap((s) => s.points);
  const raw = extent(all);
  // 有任何 null 点就说明这段有采集空档（用于图例里的提示）
  const gaps = series.some((s) => s.points.some((v) => v === null));

  const domain: [number, number] = raw
    ? padDomain(zeroBased ? [Math.min(0, raw[0]), raw[1]] : raw)
    : [0, 1];

  const yOf = linear(domain, [TOP + plotH, TOP]); // 屏幕 y 向下 → 反过来
  const ticks = niceTicks(domain[0], domain[1], 4);
  const fmt = (v: number) =>
    yFormat ? yFormat(v) : `${Number.isInteger(v) ? v : Number(v.toFixed(1))}${yUnit}`;

  // x：等间距（后端已按固定 step 采样），下标映射
  const n = Math.max(...series.map((s) => s.points.length), 0);
  const xOf = (i: number) =>
    LEFT + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);

  const xs = from !== undefined && to !== undefined && to > from ? timeTicks(from, to, 4) : [];
  const xAt = (t: number) =>
    from !== undefined && to !== undefined && to > from
      ? LEFT + ((t - from) / (to - from)) * plotW
      : LEFT;

  const empty = !raw;

  return (
    <div className={className} style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        style={{ display: 'block', height: 'auto' }}
      >
        {/* 横向网格 + y 轴标签 */}
        {ticks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={LEFT}
              y1={yOf(t)}
              x2={W - RIGHT}
              y2={yOf(t)}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={LEFT - 8}
              y={yOf(t) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--muted)"
            >
              {fmt(t)}
            </text>
          </g>
        ))}

        {/* x 轴标签（时间） */}
        {xs.map((t) => (
          <text
            key={`x${t}`}
            x={xAt(t)}
            y={H - 6}
            textAnchor="middle"
            fontSize={11}
            fill="var(--muted)"
          >
            {formatClock(t, to !== undefined && to - (from ?? t) > 86400)}
          </text>
        ))}

        {empty ? (
          <text
            x={LEFT + plotW / 2}
            y={TOP + plotH / 2}
            textAnchor="middle"
            fontSize={12}
            fill="var(--muted)"
          >
            这段时间没有采样数据
          </text>
        ) : (
          series.map((s, si) => {
            const color = s.color ?? TONE_VAR[s.tone ?? 'primary'];
            const pts = s.points.map((v, i) =>
              v === null ? null : { x: xOf(i), y: yOf(v) },
            );
            const line = linePath(pts);
            const area = s.fill === false ? '' : areaPath(pts, TOP + plotH);
            return (
              <g key={`${s.name}-${si}`}>
                {area ? <path d={area} fill={color} fillOpacity={0.14} stroke="none" /> : null}
                {line ? (
                  <path
                    d={line}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </g>
            );
          })
        )}
      </svg>

      {showLegend && series.length > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            marginTop: 6,
            fontSize: '0.78rem',
            color: 'var(--muted)',
          }}
        >
          {series.map((s, i) => (
            <span key={`${s.name}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 3,
                  borderRadius: 2,
                  background: s.color ?? TONE_VAR[s.tone ?? 'primary'],
                  display: 'inline-block',
                }}
              />
              {s.name}
            </span>
          ))}
          {gaps ? <span>· 虚线断口 = 该时段无采样</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** 时间刻度文字：跨度 > 1 天显示「日 时」，否则「时:分」。 */
function formatClock(ts: number, withDate: boolean): string {
  const d = new Date(ts * 1000);
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  if (!withDate) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}`;
}
