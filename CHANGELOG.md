# 变更记录

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
