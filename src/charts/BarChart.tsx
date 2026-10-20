/**
 * 横条图（各核使用率、磁盘用量、流量占比…）。
 *
 * ## 为什么用 HTML 而不是 SVG
 *
 * 条形图的文字（核编号、百分比）必须**在任何宽度都清晰**。SVG 等比缩放会把
 * 字号一起缩小，窄屏就糊了；HTML + flex 天然自适应，还能被读屏软件正确朗读。
 * 所以这里不画 SVG —— 图表不等于「必须用 SVG」，选对载体更重要。
 *
 * ## 空值语义
 *
 * `value` 为 `null` → 显示「—」且条为空（不是 0 长度的实心条）。
 */
export type BarTone = 'primary' | 'ok' | 'warn' | 'danger' | 'muted';

const TONE_VAR: Record<BarTone, string> = {
  primary: 'var(--primary)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  muted: 'var(--muted)',
};

export interface BarItem {
  label: string;
  /** 实际值；用于算长度。`null` = 没取到。 */
  value: number | null;
  /** 条的颜色。不给就用 `primary`。 */
  tone?: BarTone;
  /** 右侧文字；不给就按 `value + unit` 自动生成。 */
  text?: string;
}

export interface BarChartProps {
  items: readonly BarItem[];
  /** 满格对应的值。默认取所有非空项的最大值。 */
  max?: number;
  unit?: string;
  /** 每行高度（px），默认 22。 */
  rowHeight?: number;
  /** 左侧标签固定宽度（px），默认 64。 */
  labelWidth?: number;
  /** 数值文案的格式化函数（优先于 unit）。 */
  format?: (v: number) => string;
  ariaLabel?: string;
  className?: string;
}

export default function BarChart({
  items,
  max,
  unit = '',
  rowHeight = 22,
  labelWidth = 64,
  format,
  ariaLabel = '条形图',
  className,
}: BarChartProps) {
  const values = items.map((i) => i.value).filter((v): v is number => v !== null && Number.isFinite(v));
  const top = max ?? (values.length ? Math.max(...values) : 1);
  const denom = top > 0 ? top : 1;

  const textOf = (v: number | null): string => {
    if (v === null || !Number.isFinite(v)) return '—';
    if (format) return format(v);
    const rounded = Math.abs(v) >= 10 ? Math.round(v) : Number(v.toFixed(1));
    return `${rounded}${unit}`;
  };

  return (
    <div className={className} role="img" aria-label={ariaLabel} style={{ width: '100%' }}>
      {items.map((it) => {
        const pct =
          it.value === null || !Number.isFinite(it.value)
            ? 0
            : Math.max(0, Math.min(100, (it.value / denom) * 100));
        const color = TONE_VAR[it.tone ?? 'primary'];
        return (
          <div
            key={it.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: rowHeight,
              fontSize: '0.78rem',
            }}
          >
            <span
              style={{
                width: labelWidth,
                flex: `0 0 ${labelWidth}px`,
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={it.label}
            >
              {it.label}
            </span>
            <span
              style={{
                flex: 1,
                height: Math.max(4, rowHeight - 12),
                borderRadius: 3,
                background: 'color-mix(in oklab, var(--muted) 14%, transparent)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {it.value === null ? null : (
                <span
                  style={{
                    display: 'block',
                    width: `${pct}%`,
                    height: '100%',
                    background: color,
                    borderRadius: 3,
                    transition: 'width .3s ease',
                  }}
                />
              )}
            </span>
            <span
              style={{
                width: 54,
                flex: '0 0 54px',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: it.value === null ? 'var(--muted)' : 'var(--text)',
              }}
            >
              {it.text ?? textOf(it.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
