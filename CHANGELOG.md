# 变更记录

## 0.2.1 — 2026-10-21

### 新增：`datatable` / `forms` / `tokens`

| 导出 | 用途 |
|---|---|
| `korikura-webui/datatable` | `DataTable`：列定义 + 行数据 → 表（数字右对齐、空态、行操作插槽、可选排序） |
| `korikura-webui/forms/Field` | 字段容器（`.astro` + `.tsx` 孪生）：标签/提示/错误行 |
| `korikura-webui/forms/Toggle` | 二元开关（`role="switch"`），不用 Toggle 冒充单选 |
| `styles/tokens` | 图表/表格语义令牌：`--chart-1..6`、`--chart-grid`、`--table-stripe` |

`DataTable` 与图表同样是「纯 props → 标记」：不加 `client:*` 为静态表；
加 `client:load` 才有表头排序。空态只表达「确实没有」——「取不到」请用 `ErrorState`。

### 修复

- **`.field` 补 `margin-bottom: 14px`**（BEST-PRACTICES §五 坑 6）。
  两个接入方（cokee-neumooc / Cokee UAI）早已各自覆盖成同一个值，
  所以对它们是 no-op；这里只是把「每个项目都要记得补」变成包内默认。
  它们各自的覆盖可以后续清理（不影响视觉）。

### 工具

- `scripts/check-ui-parity.mjs`：
  - 扫描范围从 `src/components/ui` 扩到 **`src/forms`**
  - 新增 `TSX_ONLY` 白名单：纯标记/仅岛屿使用的组件可以只有 `.tsx`，
    但**必须显式声明**，否则仍报错（防止「忘了补 .astro」混过去）

---

## 0.2.0 — 2026-10-21

### 新增：`charts` 模块（零运行时依赖）

纯 SVG 图表，**服务端可直接渲染**（在 `.astro` 里写 `<AreaChart … />` 不加
`client:*`，Astro 会渲染成静态 HTML，不向客户端发 JS）。

| 导出 | 用途 |
|---|---|
| `Sparkline` | 指标卡里的一行趋势 |
| `AreaChart` | 多序列面积/折线（时间轴可选） |
| `BarChart` | 横条图（各核、磁盘用量） |
| `scale.ts` | `extent` / `niceTicks` / `linear` / `timeTicks` / `padDomain` / `clamp` |
| `path.ts` | `linePath` / `areaPath` / `sparkPath` / `singlePoint` |

引入方式（按需，tree-shaking 友好）：

```js
import { Sparkline, AreaChart, BarChart } from 'korikura-webui/charts';
// 或单文件：import Sparkline from 'korikura-webui/charts/Sparkline.tsx';
```

**为什么手写而不引 ECharts/uPlot**：只需要 4 种图形；图表必须能 SSR 出图
（ECharts/uPlot 依赖 DOM）；手写约 5KB，纯函数好单测。

### 新增：`scripts.test` 与 `pnpm test`

```bash
pnpm test        # node --test src/charts/*.test.ts（零测试依赖）
pnpm run check   # 孪生组件标记一致性
```

24 个单测覆盖刻度选择、路径构造、空值（`null` 断线）、单点、等值数据等边界。

### 关于孪生规则（重要）

`charts/` **只有 `.tsx`，没有 `.astro` 孪生**。这是**刻意**的：

- 它们是「纯 props → 纯标记」，不含 hook/状态，在 `.astro` 里不加 `client:*`
  时会由 Astro 静态渲染成 HTML；
- 两份实现必然漂移，而这里不存在「SSR 版 vs 岛屿版」的差异需求。

`check-ui-parity.mjs` 只扫描 `src/components/ui/`，因此不受影响。
**其它原语仍必须成对**（规则不变）。

写新图表时必须遵守：不 import hook、不读 `Date.now()` / `Math.random()`。
否则 SSR 与客户端重绘会不一致。

## 0.1.0 — 初始版本

`Base` / `Navbar` / `Footer` / `LoginCard` / `SearchPanel` / `InlineDialog`
+ 5 个 UI 原语（`StatCard` / `ProgressBar` / `StatusBadge` / `EmptyState` / `ErrorState`）。
