/**
 * 错误状态（React 版）：取数失败时用。
 *
 * ⚠️ **与 `ErrorState.astro` 是同一套标记与类名**，改一个必须改另一个。
 *
 * 比 .astro 版多一个 `onRetry` —— 岛屿里能直接重跑请求，不必整页刷新。
 * 不传 `onRetry` 时退化成链接（与 .astro 版行为一致）。
 */
import type { ReactNode } from 'react';

export interface ErrorStateProps {
  text?: string;
  /** `text` 的别名 */
  reason?: string;
  /** 标题。默认「数据加载失败」 */
  title?: string;
  /** 重试入口（整页刷新） */
  retryHref?: string;
  /** 重试回调。传了就用按钮，不传用链接 */
  onRetry?: () => void;
  /** 是否追加「不代表没有数据」的说明。默认 true */
  explain?: boolean;
  children?: ReactNode;
}

export default function ErrorState({
  text,
  reason,
  title = '数据加载失败',
  retryHref,
  onRetry,
  explain = true,
  children,
}: ErrorStateProps) {
  const msg = text ?? reason ?? '';
  const href =
    retryHref ?? (typeof window === 'undefined' ? '/' : window.location.href);
  return (
    <div className="empty-state is-error">
      <p className="empty-title">{title}</p>
      {msg && (
        <p className="empty-desc">
          {msg}
          {explain ? '。这不代表没有数据，只是这次没取到。' : ''}
        </p>
      )}
      {onRetry ? (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          重试
        </button>
      ) : (
        <a className="btn btn-sm" href={href}>
          重新加载
        </a>
      )}
      {children}
    </div>
  );
}
