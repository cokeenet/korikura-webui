/**
 * 表单字段容器（React 版，与 `Field.astro` 是孪生）。
 *
 * 统一「标签在上、控件居中、提示/错误在下」的排版，并复用包里的 `.field`
 * （它已经在 2026-10-21 补上了 `margin-bottom: 14px`，见 BEST-PRACTICES §五）。
 *
 * ⚠️ 与 `.astro` 版的**标记与类名必须完全一致**（孪生规则），
 *    改一处就要改另一处，否则同站点两种渲染会长得不一样。
 */
import type { ReactNode } from 'react';

export interface FieldProps {
  /** 标签文案 */
  label: string;
  /** 控件（input / select / textarea / 自定义） */
  children: ReactNode;
  /** 控件下方的辅助说明 */
  hint?: string;
  /** 错误文案：给了就显示红色错误行（优先于 hint） */
  error?: string;
  /** 关联控件的 id（label 的 for 属性） */
  htmlFor?: string;
}

export default function Field({ label, children, hint, error, htmlFor }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <p className="small" style={{ margin: 0, color: 'var(--danger)' }} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="small" style={{ margin: 0, color: 'var(--muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
