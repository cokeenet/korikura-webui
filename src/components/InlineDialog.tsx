/**
 * 行内确认 / 行内输入组件。
 *
 * 替代浏览器的 `confirm()` 与 `prompt()`：
 *   - 样式与站点一致，不再突兀弹出系统对话框
 *   - 可做输入校验（`prompt` 做不到）
 *   - 可控宽度与提示文案，不依赖浏览器差异
 */
import { useEffect, useRef, useState } from 'react';

interface ConfirmProps {
  /** 触发按钮文案 */
  label: string;
  /** 确认区提示 */
  question: string;
  /** 确认按钮文案 */
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  /** 危险操作（删除）用红色 */
  danger?: boolean;
  /** 需要用户输入指定文本才能确认（如输入手机号） */
  requireText?: string;
  className?: string;
}

export function InlineConfirm({
  label,
  question,
  confirmLabel = '确认',
  onConfirm,
  disabled,
  danger,
  requireText,
  className,
}: ConfirmProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 点外部收起：避免多个确认区同时展开造成困惑
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTyped('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const ok = !requireText || typed.trim() === requireText;

  if (!open) {
    return (
      <button
        className={className ?? `btn btn-sm${danger ? '' : ''}`}
        style={danger ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      ref={boxRef}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        border: `1px solid ${danger ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)',
        minWidth: 200,
      }}
    >
      <span style={{ fontSize: '0.83rem' }}>{question}</span>
      {requireText && (
        <input
          className="input"
          style={{ fontSize: '0.82rem' }}
          value={typed}
          placeholder={`输入 ${requireText} 以确认`}
          onChange={(e) => setTyped(e.target.value)}
          autoFocus
        />
      )}
      <div className="row" style={{ gap: 6 }}>
        <button
          className="btn btn-sm btn-primary"
          style={danger ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setOpen(false);
              setTyped('');
            }
          }}
        >
          {busy ? '处理中…' : confirmLabel}
        </button>
        <button
          className="btn btn-sm"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setTyped('');
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}

interface PromptProps {
  label: string;
  /** 输入框占位 */
  placeholder?: string;
  /** 确认按钮文案 */
  confirmLabel?: string;
  /** 最少字符数（如密码 8 位） */
  minLength?: number;
  type?: string;
  onSubmit: (value: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

/** 行内输入（替代 `prompt()`），带长度校验。 */
export function InlinePrompt({
  label,
  placeholder,
  confirmLabel = '确定',
  minLength = 0,
  type = 'text',
  onSubmit,
  disabled,
  className,
}: PromptProps) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button className={className ?? 'btn btn-sm'} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  const tooShort = minLength > 0 && val.length < minLength;

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)',
        minWidth: 220,
      }}
    >
      <input
        className="input"
        style={{ fontSize: '0.82rem' }}
        type={type}
        value={val}
        placeholder={placeholder ?? (minLength ? `至少 ${minLength} 位` : '')}
        onChange={(e) => setVal(e.target.value)}
        autoFocus
      />
      {tooShort && val.length > 0 && (
        <span style={{ fontSize: '0.76rem', color: 'var(--warn)' }}>
          还需 {minLength - val.length} 位
        </span>
      )}
      <div className="row" style={{ gap: 6 }}>
        <button
          className="btn btn-sm btn-primary"
          disabled={busy || val.length === 0 || tooShort}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(val);
            } finally {
              setBusy(false);
              setOpen(false);
              setVal('');
            }
          }}
        >
          {busy ? '处理中…' : confirmLabel}
        </button>
        <button
          className="btn btn-sm"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setVal('');
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}
