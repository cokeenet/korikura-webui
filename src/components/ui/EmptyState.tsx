/**
 * 空状态（React 版）。
 *
 * ⚠️ **与 `EmptyState.astro` 是同一套标记与类名**，改一个必须改另一个。
 * React 岛屿无法引用 .astro 组件 —— 这也是本文件存在的原因：
 * 以前每个接入方各自复制一份 .tsx，复制时顺手改了样式，
 * 于是 SSR 页和岛屿显示成两种样子，包这边毫无察觉。
 * `scripts/check-ui-parity.mjs` 做静态检查。
 */
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  text?: string;
  hint?: string;
  /** `text` 的别名 */
  title?: string;
  /** `hint` 的别名 */
  desc?: string;
  href?: string;
  action?: string;
  children?: ReactNode;
}

export default function EmptyState({
  text,
  hint,
  title,
  desc,
  href,
  action,
  children,
}: EmptyStateProps) {
  const msg = text ?? title ?? '暂无数据';
  const sub = hint ?? desc;
  return (
    <div className="empty-state">
      <p className="empty-title">{msg}</p>
      {sub && <p className="empty-desc">{sub}</p>}
      {href && action && (
        <a className="btn btn-sm" href={href}>
          {action}
        </a>
      )}
      {children}
    </div>
  );
}
