/**
 * 数据表（React 岛屿或纯 SSR 渲染）。
 *
 * ## 为什么参数是「列定义 + 行数据」而不是 slot
 *
 * 面板里已经有 5 张手写表（服务/磁盘/端口/定时任务/进程），每张都在重复
 * 「表头 / 数字右对齐 / 空态 / 斑马纹」四件事。列定义能把**对齐与格式**收到
 * 一处；行内操作通过 `actions` 插槽传，不侵入列模型。
 *
 * ## 两种使用方式
 *
 * · **纯 SSR**：`<DataTable … />`（不加 `client:*`）→ 静态 HTML，零 JS。
 *   此时 `sortable` 无效（排序要状态）。
 * · **岛屿**：`<DataTable client:load … />` → 点表头排序。
 *
 * ## 空值语义
 *
 * 空数据由 `emptyText` 决定文案。**「取不到」不要用这个组件表达** ——
 * 取不到该显示 `ErrorState`，两者语义不同（BEST-PRACTICES §九第 5 条）。
 */
import { useMemo, useState, type ReactNode } from 'react';

export type Align = 'left' | 'right';

export interface DataColumn<T> {
  /** 列标识（排序、React key 都用它） */
  key: string;
  title: string;
  align?: Align;
  /** 固定宽度（px 或 CSS 值） */
  width?: number | string;
  /** 单元格渲染；不给则取 `row[key]` */
  render?: (row: T) => ReactNode;
  /** 排序取值；给了且 `sortable` 为真时，表头可点 */
  sortValue?: (row: T) => number | string;
  /** 单元格加等宽字体（PID / MAC / 命令这类） */
  mono?: boolean;
  /** 单元格附加 class */
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  /** 行唯一键 */
  rowKey: (row: T) => string | number;
  /** 空态主文案（「确实没有」，不是「取不到」） */
  emptyText?: string;
  emptyHint?: string;
  /** 初始排序列（列 key）；不给则保持传入顺序 */
  defaultSort?: string;
  /** 默认排序方向 */
  defaultDesc?: boolean;
  /** 是否允许点表头排序（需要岛屿 hydrate） */
  sortable?: boolean;
  /** 行操作插槽（放在最右一列） */
  actions?: (row: T) => ReactNode;
  actionsTitle?: string;
  /** 表格下方说明 */
  footnote?: ReactNode;
  className?: string;
}

const key = (v: number | string): number | string => v;

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = '没有数据',
  emptyHint,
  defaultSort,
  defaultDesc = false,
  sortable = false,
  actions,
  actionsTitle = '操作',
  footnote,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSort ?? null);
  const [desc, setDesc] = useState(defaultDesc);

  const sorted = useMemo(() => {
    if (!sortable || !sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const out = [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb), 'zh-Hans-CN');
    });
    return desc ? out.reverse() : out;
  }, [rows, sortable, sortKey, desc, columns]);

  const clickHead = (col: DataColumn<T>) => {
    if (!sortable || !col.sortValue) return;
    if (sortKey === col.key) setDesc((d) => !d);
    else {
      setSortKey(col.key);
      setDesc(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className={className}>
        <div className="empty-state" style={{ padding: '18px 0' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{emptyText}</p>
          {emptyHint ? (
            <p className="small" style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
              {emptyHint}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => {
              const canSort = sortable && !!c.sortValue;
              const active = sortKey === c.key;
              return (
                <th
                  key={c.key}
                  style={{
                    width: c.width,
                    textAlign: c.align ?? 'left',
                    cursor: canSort ? 'pointer' : undefined,
                    userSelect: canSort ? 'none' : undefined,
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => clickHead(c)}
                  title={canSort ? '点击排序' : undefined}
                  aria-sort={active ? (desc ? 'descending' : 'ascending') : undefined}
                >
                  {c.title}
                  {active ? (
                    <span style={{ marginLeft: 4, color: 'var(--primary)' }}>
                      {desc ? '↓' : '↑'}
                    </span>
                  ) : null}
                </th>
              );
            })}
            {actions ? <th style={{ width: 100 }}>{actionsTitle}</th> : null}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={key(rowKey(row))}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={[c.mono ? 'mono' : '', c.className ?? ''].filter(Boolean).join(' ') || undefined}
                  style={{ textAlign: c.align ?? 'left' }}
                >
                  {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as ReactNode)}
                </td>
              ))}
              {actions ? <td>{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {footnote ? (
        <p className="small" style={{ marginTop: 10, marginBottom: 0, color: 'var(--muted)' }}>
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
