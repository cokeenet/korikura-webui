/**
 * 开关（受控组件）。
 *
 * 用 `<button role="switch">` 而不是 checkbox：
 *   · 能直接放文字说明，不需要额外包一层 label
 *   · 键盘空格/回车天然可用，`aria-checked` 语义清晰
 *   · 样式好控制（checkbox 的 UA 样式在各浏览器差异大）
 *
 * 与页面里那些「小胶囊按钮」视觉一致，但它是**二元状态**而不是多选一 ——
 * 前者用 Toggle，后者用一组按钮（不要用 Toggle 冒充单选）。
 */
import type { CSSProperties } from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 开/关时的文案（默认「开」「关」） */
  onLabel?: string;
  offLabel?: string;
  disabled?: boolean;
  /** 无障碍标签（没给就用 onLabel/offLabel 拼） */
  ariaLabel?: string;
  title?: string;
}

export default function Toggle({
  checked,
  onChange,
  onLabel = '开',
  offLabel = '关',
  disabled,
  ariaLabel,
  title,
}: ToggleProps) {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 10px 4px 6px',
    borderRadius: 999,
    border: '1px solid var(--border)',
    background: checked
      ? 'color-mix(in oklab, var(--primary) 14%, var(--card-bg))'
      : 'var(--card-bg)',
    color: checked ? 'var(--primary)' : 'var(--text)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontSize: '0.82rem',
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? `${onLabel}/${offLabel}`}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={style}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 15,
          borderRadius: 999,
          background: checked
            ? 'color-mix(in oklab, var(--primary) 55%, transparent)'
            : 'color-mix(in oklab, var(--muted) 35%, transparent)',
          position: 'relative',
          display: 'inline-block',
          transition: 'background .15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 1.5,
            left: checked ? 13 : 1.5,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: checked ? 'var(--primary)' : 'var(--muted)',
            transition: 'left .15s',
          }}
        />
      </span>
      {checked ? onLabel : offLabel}
    </button>
  );
}
