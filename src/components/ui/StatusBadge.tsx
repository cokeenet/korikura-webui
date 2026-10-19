/**
 * 状态徽标（React 版）。`tone` 决定配色。
 *
 * ⚠️ **与 `StatusBadge.astro` 是同一套标记与类名**，改一个必须改另一个。
 * `scripts/check-ui-parity.mjs` 做静态检查。
 */
export type BadgeTone = 'ok' | 'fail' | 'warn' | 'run' | 'muted';

export interface StatusBadgeProps {
  text: string;
  tone?: BadgeTone;
  title?: string;
}

export default function StatusBadge({
  text,
  tone = 'muted',
  title,
}: StatusBadgeProps) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {text}
    </span>
  );
}
