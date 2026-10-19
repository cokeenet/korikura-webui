/**
 * 进度条（React 版）：`▓▓▓░░░ 11/49 22%`。
 *
 * ⚠️ **与 `ProgressBar.astro` 是同一套标记与类名**，改一个必须改另一个。
 * `scripts/check-ui-parity.mjs` 做静态检查。
 */
export interface ProgressBarProps {
  finish: number;
  total: number;
  /** 是否显示右侧的 `11/49 22%` 文字。默认显示 */
  showText?: boolean;
  /** 无障碍标签。默认「已完成 N / M」 */
  label?: string;
}

export default function ProgressBar({
  finish,
  total,
  showText = true,
  label,
}: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.round((finish / total) * 100)) : 0;
  const done = total > 0 && finish >= total;
  return (
    <div className="progress">
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={finish}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label ?? `已完成 ${finish} / ${total}`}
      >
        <div
          className={`progress-fill${done ? ' is-done' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showText && (
        <span className="progress-text">
          {finish}/{total} {pct}%
        </span>
      )}
    </div>
  );
}
