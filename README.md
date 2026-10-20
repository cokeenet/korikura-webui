# korikura-webui

**Astro + React 的通用 UI 框架** —— korikura 风格的导航、毛玻璃、视图过渡与组件原语。

[![License: CC BY-NC 4.0](https://img.shields.io/badge/license-CC%20BY--NC%204.0-lightgrey.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-%5E7.0-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-%5E19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-%5E4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

把一套已经打磨过的站点外观抽成可复用的布局、组件与样式：主题变量、滚动态导航、
毛玻璃浮层、视图过渡、动效，以及一组 SSR / React 双版本的基础原语。
没有运行时依赖，样式基于 Tailwind v4 与 CSS 变量，换主色只改一个变量。

## 图表（v0.2.0 新增）

纯 SVG、**零运行时依赖**、服务端可直接渲染。在 `.astro` 里不加 `client:*`
就是静态 HTML（不发 JS）；需要交互时再当 React 岛屿用。

```astro
---
import { Sparkline, AreaChart } from 'korikura-webui/charts';
---
<Sparkline values={[1, 3, 2, 5]} />
<AreaChart
  series={[{ name: 'CPU', points: [0.2, 0.5, null, 0.3], tone: 'primary' }]}
  from={from} to={to} yFormat={(v) => `${Math.round(v * 100)}%`} zeroBased
/>
```

要点：

- `null` 表示「该时刻没采到数据」→ **断线**，不插值（插值会掩盖采集失败）。
- 组件**只有 `.tsx`**：纯标记、无 hook，`.astro` 里静态渲染即可。
  详见 [CHANGELOG](CHANGELOG.md#关于孪生规则重要)。
- 单测：`pnpm test`（`node --test`，零依赖）。

---

## 特性

- **主题**：CSS 变量驱动，改 `--hue` 换主色；亮色 / 暗色 / 跟随系统三态，首屏不闪
- **导航**：滚动态浮动胶囊、移动端抽屉、`Ctrl/⌘ + K` 快速跳转
- **视图过渡**：基于 Astro ClientRouter 的整页进出场，导航保持不动
- **组件**：布局、导航、登录卡片、空状态 / 错误态 / 统计卡 / 徽标 / 进度条
  —— 每套都有 `.astro`（SSR）与 `.tsx`（React 岛屿）两个版本
- **细节**：毛玻璃、主色氛围光、动态几何图案背景、随主题切换的鼠标指针
- **可访问性**：尊重 `prefers-reduced-motion`，焦点环、语义化结构、键盘可达

## 安装

```bash
pnpm add github:cokeenet/korikura-webui
# 本地开发：pnpm add file:../korikura-webui
```

以下依赖声明在 `peerDependencies`，由使用方提供（避免装出第二份 React）：

```bash
pnpm add astro react react-dom @astrojs/react tailwindcss
```

## 快速开始

### 1. 引入样式

```css
/* src/styles/app.css */
@import 'korikura-webui/styles.css';

/* 项目自己的样式写在后面，便于覆盖变量 */
@import './your-own.css';
```

### 2. 用 `Base` 包住页面

```astro
---
import Base from 'korikura-webui/components/Base.astro';

const links = [
  { href: '/', label: '首页' },
  { href: '/about', label: '关于' },
];
---

<Base title="首页" siteName="我的站点" links={links} loggedIn={!!Astro.locals.user}>
  <h1 class="page-title">标题</h1>
  <p class="page-desc">说明文字</p>

  <div class="card">…</div>
</Base>
```

`Base` 已经包含 `<head>`、主题初始化、视图过渡、导航与页脚。

### 3. 注册客户端行为

导航、主题、抽屉的行为在 `lib/ui.ts`，用 `onPageReady` 注册 —— 启用视图过渡后，
换页不会重新执行内联脚本，直接写在页面里的初始化只会生效一次。

```astro
<script>
  import {
    onPageReady, initNavScroll, initDrawer, initTheme,
    initLogout, initReveal, initBackToTop, initMotionBg,
  } from 'korikura-webui/lib/ui';

  onPageReady(() => {
    initNavScroll();
    initDrawer();
    initTheme();
  });

  // 登出：包里只有按钮外观，接口由使用方接
  initLogout({ endpoint: '/api/auth/logout', redirect: '/login' });

  // 可选
  initReveal();       // 元素加 class="reveal" 后滚动渐现
  initBackToTop();    // 注入回到顶部按钮
  initMotionBg();     // 动态几何图案背景
</script>
```

## 组件

| 组件 | 参数 |
|---|---|
| `Base.astro` | `title` `siteName`* `links` `credits` `favicon` `loggedIn` `bare` |
| `Navbar.astro` | `siteName`* `links`* `favicon` `loginHref` `loggedIn` |
| `SearchPanel.astro` | `links`* |
| `LoginCard.astro` | `title`* `subtitle` `endpoint` `redirectParam` `fallback` `usernameLabel` `passwordLabel` `submitText` |
| `Footer.astro` | `siteName`* `credits` `hidden` |
| `ui/StatCard.astro` | `value`* `label`* `tone` `hint` |
| `ui/StatusBadge.astro` | `text`* `tone` `title` |
| `ui/EmptyState.astro` | `text` `hint` `href` `action` |
| `ui/ErrorState.astro` | `text` `title` `retryHref` `explain` |
| `ui/ProgressBar.astro` | `value` `max` `finish` `total` `showText` |
| `InlineDialog.tsx` | 见文件内注释 |

（`*` = 必填；`tone` 取值 `primary` / `ok` / `warn` / `danger` / `fail` / `run` / `muted`）

原生组件都有对应的 `.tsx` 版本，供 React 岛屿使用 —— 岛屿无法引用 `.astro` 组件。
两份的标记、类名与默认文案保持一致，`pnpm run check` 会做静态比对。

### 登录页

`LoginCard` 出外观，`initLogin()` 出行为：防连点、站内跳转白名单、服务端文案优先。

```astro
---
import LoginCard from 'korikura-webui/components/LoginCard.astro';
---

<LoginCard title="示例后台" subtitle="登录后才能操作" endpoint="/api/auth/login" />
```

后端不必为前端改格式：成功判定兼容 `{ ok: true }`、`{ code: 0 }`、只看 HTTP 状态；
错误文案按 `error → detail → message` 取第一个有值的。

## 主题

所有颜色都是一个 CSS 变量的值，改 `--hue` 就能整体换色：

```css
:root {
  --hue: 350;             /* 350 = 粉；220 = 蓝；150 = 绿 */

  --primary / --bg / --card-bg / --text / --muted / --border
  --ok / --warn / --danger
  --nav-h: 60px;  --container: min(1360px, 97vw);
  --radius-sm / --radius-md / --radius-lg
}
```

覆盖方式：在使用方的样式里、包的样式**之后**写 `:root { --hue: 220 }`。

亮暗模式由 `<html data-theme="light|dark">` 控制，`Base` 在首屏渲染前就写好，
不会白闪；切换按钮由 `initTheme()` 接管。需要自定义外观时，覆盖
`--hero-tint`（顶部氛围光）、`--hero-veil`（底色遮罩）、`--hero-image`（背景大图）。

## 交互细节

- **鼠标指针**：随主题切换的内联光标（`styles/cursor.css`，base64），装上即生效，
  不用往 `public/` 拷文件。上游把 `input / textarea / select` 也归入手型，
  想要 I-beam 的话从该文件的选择器里删掉即可。
- **动态图案**：`initMotionBg()` 注入缓慢平移的几何底纹，可用 `speed` / `opacity` 调整。
- **滚动揭示**：元素加 `.reveal`，`initReveal()` 负责进入视口时淡入。

## 开发

```bash
pnpm install
cd examples && pnpm install
pnpm run example:dev     # 打开示例站点（http://localhost:4321）
pnpm run check           # 校验 SSR / React 双版本的一致性
pnpm run example:build   # 构建示例，确认包本身可被正常使用
```

`examples/` 是最小可运行示例，也是验证包本身的入口。

## 贡献

- 提交前跑 `pnpm run check` 与 `pnpm run example:build`
- 修改原生组件时两个版本一起改，保持类名与文案一致
- 共享样式的改动会影响到所有使用方，请单独提交并说明影响

## 致谢

本项目的视觉与交互语言来自 **[korikura-theme](https://github.com/foxmoe/korikura-theme)**。
样式数值、动效曲线与导航行为都从该项目移植而来，在此致谢原作者。

同时感谢 [Astro](https://astro.build)、[React](https://react.dev)、
[Tailwind CSS](https://tailwindcss.com) 及其生态。

## 许可

[CC BY-NC 4.0](LICENSE)（署名 - 非商业性使用）。与 korikura-theme 保持一致。
