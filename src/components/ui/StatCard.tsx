/**
 * 统计卡片（React 版）。
 *
 * ⚠️ **与 `StatCard.astro` 是同一套标记与类名**，改一个必须改另一个。
 * `scripts/check-ui-parity.mjs` 做静态检查。
 */
export type StatTone = 'primary' | 'ok' | 'warn' | 'danger' | 'muted';

export interface StatCardProps {
  value: string | number;
  label: string;
  tone?: StatTone;
  hint?: string;
}

export default function StatCard({ value, label, tone, hint }: StatCardProps) {
  return (
    <div className="card">
      <div
        className="stat-value"
        style={tone ? { color: `var(--${tone})` } : undefined}
      >
        {value}
      </div>
      <div className="stat-label">
        {label}
        {hint && (
          <span className="muted" style={{ display: 'block', fontSize: '0.72rem' }}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
