/**
 * 导航与视图过渡的客户端逻辑。
 *
 * ## 为什么集中在这里而不是写在 .astro 的内联 script 里
 *
 * 启用 ClientRouter（视图过渡）后，站内跳转**不再整页刷新** ——
 * Astro 只替换 DOM，**内联脚本不会重新执行**。
 * 把逻辑写成模块并用 `init()` 统一注册，才能保证
 * ① 首次加载立即生效 ② 每次 astro:page-load 重新绑定 ③ 不重复绑。
 *
 * ## 两条铁律（都是实测踩出来的）
 *
 * 1. **不要把 DOM 元素存进闭包**。
 *    ClientRouter 换页会替换掉整个导航 DOM，旧元素虽在内存里但已**脱离文档**，
 *    继续写它的 dataset 页面上毫无反应。
 *    症状：跳转一次后滚动态永久卡在 `top`、Ctrl+K 失效。
 *    → 一律用 `document.querySelector` **实时查询**。
 *
 * 2. **document / window 级监听只能绑一次**。
 *    它们在换页后依然有效，重复绑会让一次点击触发多次。
 *    → 用 window 上的标记位防重复。
 */

declare global {
  interface Window {
    __korikuraNavButtonBound?: boolean;
    __korikuraNavScrollBound?: boolean;
    __korikuraDrawerDocBound?: boolean;
    __korikuraThemeBound?: boolean;
    __korikuraSearchBound?: boolean;
  }
}

const NAV_FLAG = '__korikuraNavScrollBound';
const DRAWER_FLAG = '__korikuraDrawerDocBound';
const THEME_FLAG = '__korikuraThemeBound';
const SEARCH_FLAG = '__korikuraSearchBound';

const THEME_KEY = 'theme-mode';
type ThemeMode = 'auto' | 'light' | 'dark';

/** 在每次页面就绪时执行 `fn`（首次加载 + 每次 SPA 换页）。 */
export function onPageReady(fn: () => void): void {
  fn();
  document.addEventListener('astro:page-load', fn);
}

/* ── 导航滚动态 ──────────────────────────────────────── */

/**
 * data-nav 三态：`top` 贴顶 / `down` 向下滚 / `up` 向上滚。
 *
 * 阈值 2px 是防抖 —— 否则手指轻微抖动会让导航反复横跳。
 * 用 requestAnimationFrame + ticking 节流：scroll 触发极频繁，
 * 每次都改 DOM 会掉帧。
 */
export function initNavScroll(): void {
  const wrapper = () => document.querySelector('.nav-wrapper') as HTMLElement | null;
  if (!wrapper()) return;

  if (window[NAV_FLAG]) {
    const w = wrapper();
    if (w) w.dataset.nav = window.scrollY < 12 ? 'top' : 'down';
    return;
  }
  window[NAV_FLAG] = true;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const w = wrapper();
    if (!w) {
      ticking = false;
      return;
    }
    const y = window.scrollY;
    if (y < 12) w.dataset.nav = 'top';
    else if (y > lastY + 2) w.dataset.nav = 'down';
    else if (y < lastY - 2) w.dataset.nav = 'up';
    lastY = y;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      window.requestAnimationFrame(update);
      ticking = true;
    },
    { passive: true },
  );

  document.addEventListener('astro:page-load', () => {
    lastY = window.scrollY;
    update();
  });
  update();
}

/* ── 移动端抽屉 ──────────────────────────────────────── */

/**
 * 抽屉用 `<details>` 承载，JS 失效也能开合（渐进增强）。
 * 这里只补三个体验细节：汉堡按钮转发、点外部收起、Esc 收起。
 */
export function initDrawer(): void {
  const drawer = () =>
    document.getElementById('nav-drawer') as HTMLDetailsElement | null;
  const burger = () => document.getElementById('nav-burger');

  const d = drawer();
  if (!d || (d as any).__bound) return;
  (d as any).__bound = true;

  burger()?.addEventListener('click', (e) => {
    e.preventDefault();
    const el = drawer();
    if (!el) return;
    el.open = !el.open;
    burger()?.setAttribute('aria-expanded', String(el.open));
  });

  d.addEventListener('toggle', () => {
    burger()?.setAttribute('aria-expanded', String(drawer()?.open ?? false));
  });

  d.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => drawer()?.removeAttribute('open')),
  );

  // document 级：只绑一次，回调里实时查询
  if (window[DRAWER_FLAG]) return;
  window[DRAWER_FLAG] = true;

  document.addEventListener('click', (e) => {
    const el = drawer();
    if (!el?.open) return;
    const t = e.target as Node;
    if (!el.contains(t) && !burger()?.contains(t)) el.removeAttribute('open');
  });

  document.addEventListener('keydown', (e) => {
    const el = drawer();
    if (e.key === 'Escape' && el?.open) el.removeAttribute('open');
  });

  // 视口变宽（横屏/桌面）时收起，避免状态残留
  window.matchMedia('(min-width: 641px)').addEventListener('change', (ev) => {
    if (ev.matches) drawer()?.removeAttribute('open');
  });
}

/* ── 主题 ────────────────────────────────────────────── */

function applyTheme(mode: ThemeMode): void {
  const dark =
    mode === 'dark' ||
    (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  (Object.keys(THEME_ICONS) as ThemeMode[]).forEach((k) => {
    const el = document.getElementById(THEME_ICONS[k]);
    if (el) el.style.display = k === mode ? '' : 'none';
  });
  const label = { auto: '跟随系统', light: '浅色', dark: '深色' }[mode];
  document.getElementById('theme-toggle')?.setAttribute('title', `主题：${label}（点击切换）`);
  localStorage.setItem(THEME_KEY, mode);
}

const THEME_ICONS: Record<ThemeMode, string> = {
  auto: 'icon-auto',
  light: 'icon-light',
  dark: 'icon-dark',
};

/** 从点击处扩散一个主色圆（对齐上游的主题切换手感）。 */
function spawnThemeRipple(x: number, y: number): void {
  const span = document.createElement('span');
  span.className = 'theme-ripple';
  span.style.left = `${x}px`;
  span.style.top = `${y}px`;
  document.body.appendChild(span);
  // 动画结束即移除，否则反复切换会不断堆积 DOM
  span.addEventListener('animationend', () => span.remove());
}

export function initTheme(): void {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  // 每次换页后按钮是**新元素**，需要重新绑定（元素级标记足够，不会重复）
  if ((btn as any).__bound) return;
  (btn as any).__bound = true;

  applyTheme((localStorage.getItem(THEME_KEY) as ThemeMode) || 'auto');

  btn.addEventListener('click', (e) => {
    const order: ThemeMode[] = ['auto', 'light', 'dark'];
    const cur = (localStorage.getItem(THEME_KEY) as ThemeMode) || 'auto';
    const next = order[(order.indexOf(cur) + 1) % order.length];

    const r = (btn as HTMLElement).getBoundingClientRect();
    const ev = e as MouseEvent;
    spawnThemeRipple(
      ev.clientX || r.left + r.width / 2,
      ev.clientY || r.top + r.height / 2,
    );

    // 支持的浏览器让主题切换也成为一次视图过渡（更顺）
    const doc = document as any;
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => applyTheme(next));
    } else {
      applyTheme(next);
      document.documentElement.classList.add('theme-transition');
      window.setTimeout(
        () => document.documentElement.classList.remove('theme-transition'),
        400,
      );
    }
  });

  if (window[THEME_FLAG]) return;
  window[THEME_FLAG] = true;
}

/* ── 快速跳转面板 ────────────────────────────────────── */

export interface JumpLink {
  href: string;
  label: string;
}

/**
 * 毛玻璃浮层：输关键字筛页面，↑↓ 选择，回车直达，Ctrl/Cmd+K 开关。
 *
 * 博客用它搜文章；这里没有文章可搜，改为**快速跳转**，
 * 视觉与手感（毛玻璃、从下浮起、遮罩淡入）与 korikura 一致。
 */
export function initSearchPanel(links: JumpLink[]): void {
  const modal = () => document.getElementById('search-modal');
  const input = () => document.getElementById('search-input') as HTMLInputElement | null;
  const box = () => document.getElementById('search-results');

  if (!modal()) return;

  let items: JumpLink[] = [];
  let cursor = 0;

  const render = (q: string) => {
    const el = box();
    if (!el) return;
    const kw = q.trim().toLowerCase();
    items = kw ? links.filter((l) => l.label.toLowerCase().includes(kw)) : links;
    cursor = 0;
    if (!items.length) {
      el.innerHTML = '<div class="search-empty">没有匹配的页面</div>';
      return;
    }
    el.innerHTML = items
      .map(
        (l, i) =>
          `<a class="search-item${i === 0 ? ' active' : ''}" href="${l.href}"><span>${l.label}</span><kbd>↵</kbd></a>`,
      )
      .join('');
  };

  const move = (d: number) => {
    const el = box();
    if (!el) return;
    const els = el.querySelectorAll('.search-item');
    if (!els.length) return;
    els[cursor]?.classList.remove('active');
    cursor = (cursor + d + els.length) % els.length;
    els[cursor]?.classList.add('active');
    els[cursor]?.scrollIntoView({ block: 'nearest' });
  };

  const open = () => {
    const m = modal();
    const i = input();
    if (!m || !i) return;
    m.classList.add('open');
    i.value = '';
    render('');
    // 等浮层可见后再聚焦，否则 iOS 上键盘不弹
    window.setTimeout(() => i.focus(), 30);
  };
  const close = () => modal()?.classList.remove('open');

  // 元素级：每次换页重绑（按钮是新元素）
  const openBtn = document.getElementById('search-open');
  if (openBtn && !(openBtn as any).__bound) {
    (openBtn as any).__bound = true;
    openBtn.addEventListener('click', open);
  }
  const inp = input();
  if (inp && !(inp as any).__bound) {
    (inp as any).__bound = true;
    inp.addEventListener('input', () => render(inp.value));
  }

  // document 级：只绑一次
  if (window[SEARCH_FLAG]) return;
  window[SEARCH_FLAG] = true;

  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement)?.closest?.('[data-close]')) close();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      modal()?.classList.contains('open') ? close() : open();
      return;
    }
    if (!modal()?.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      const el = box()?.querySelectorAll('.search-item')[cursor] as
        | HTMLAnchorElement
        | undefined;
      if (el) {
        e.preventDefault();
        close();
        window.location.href = el.getAttribute('href') || '/';
      }
    }
  });
}

/* ── 交接给接入方的行为 ────────────────────────────────── */

/**
 * 顶部提示条。复用包里的 `.nav-toast` 样式。
 *
 * **不要用 `alert()`** —— 原生弹窗会阻断整页、手机上遮住全屏，
 * 与站内交互风格也不一致（两个接入项目都踩过）。
 *
 * 元素按需创建并挂在 `body` 上；换页后 `document.body` 里的旧元素会被
 * ClientRouter 替换掉，所以每次都是**实时查询**，不缓存引用。
 */
export function showToast(text: string, ms = 4000): void {
  let tip = document.getElementById('nav-toast');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'nav-toast';
    tip.className = 'nav-toast';
    document.body.appendChild(tip);
  }
  tip.textContent = text;
  tip.classList.add('is-show');
  window.setTimeout(() => tip?.classList.remove('is-show'), ms);
}

export interface LogoutOptions {
  /** 登出接口，`POST`。默认 `/api/auth/logout` */
  endpoint?: string;
  /** 成功后跳到哪。默认 `/login` */
  redirect?: string;
  /** 按钮选择器。默认 `#logout-btn` */
  button?: string;
  /** 失败时提示的文案（没传 `onError` 时用它） */
  failText?: string;
  /**
   * 失败回调。想显示**具体原因**（如 HTTP 状态码）时用它 ——
   * 默认只显示 `failText`。包会把 `Error` 传进来。
   */
  onError?: (err: Error) => void;
}

/**
 * 绑定登出按钮。
 *
 * ## 为什么在包里
 *
 * 包的 `Navbar` 只渲染 `#logout-btn` 的**外观**，不含业务 —— 于是每个
 * 接入方都自己写一遍，而这一遍里有三个必须做对的细节，
 * 漏一个就出问题（两个项目各自踩过、注释里都写着）：
 *
 * 1. **防连点** —— 网络慢时双击会发两次 POST
 * 2. **`cache: 'no-store'`** —— 否则浏览器可能拿缓存，退出不生效
 * 3. **失败必须说出来** —— 且**不能把按钮永久卡在灰态**
 *
 * ## 换页语义
 *
 * 内部走 `onPageReady`：启用 ClientRouter 后站内跳转不重放内联脚本，
 * 且按钮是**新元素**（旧的已脱离文档）。所以每次都用
 * `document.querySelector` 实时查询，再用 `dataset` 标记防止
 * 同一元素被重复绑定。
 */
export function initLogout(opts: LogoutOptions = {}): void {
  const {
    endpoint = '/api/auth/logout',
    redirect = '/login',
    button = '#logout-btn',
    failText = '退出失败，请重试',
    onError,
  } = opts;

  onPageReady(() => {
    const btn = document.querySelector<HTMLElement>(button);
    // 换页后是新元素，标记不会带过来；同一元素重复注册才需要挡
    if (!btn || btn.dataset.logoutBound === '1') return;
    btn.dataset.logoutBound = '1';

    btn.addEventListener('click', async () => {
      if (btn.dataset.busy === '1') return;
      btn.dataset.busy = '1';
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
      const prevTitle = btn.getAttribute('title');
      btn.setAttribute('title', '正在退出…');

      let err: Error | null = null;
      try {
        // `credentials: 'same-origin'` 显式写出来 —— 现代浏览器的默认值
        // 就是它，但代理/旧配置下会变，退出失效的排查成本远高于这一行。
        const r = await fetch(endpoint, {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!r.ok) err = new Error(`HTTP ${r.status}`);
      } catch (e) {
        err = e as Error;
      }

      if (!err) {
        // 用 replace 而不是 href：退出后不该能「后退」回已登录页面
        location.replace(redirect);
        return;
      }
      // 失败要恢复可点 —— 不能把按钮永久卡在灰态
      btn.dataset.busy = '';
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
      if (prevTitle === null) btn.removeAttribute('title');
      else btn.setAttribute('title', prevTitle);
      if (onError) onError(err);
      else showToast(failText);
    });
  });
}

/* ── 登录 ─────────────────────────────────────────────── */

export interface LoginOptions {
  /** 登录接口。默认 `/api/auth/login` */
  endpoint?: string;
  /**
   * 从哪个查询参数取登录后的跳转地址。
   * 默认 `'redirect'`；传 `false` 表示固定回默认页。
   * 无论哪种都会过站内白名单（见 `safeRedirect`）。
   */
  redirectParam?: string | false;
  /** 拿不到合法跳转地址时的去处。默认 `'/'` */
  fallback?: string;
  /** 提交中的按钮文案。默认 `'登录中…'` */
  submittingText?: string;
  formId?: string;
  submitId?: string;
  errorId?: string;
  usernameId?: string;
  passwordId?: string;
}

/**
 * 只接受站内相对路径 —— 否则 `?redirect=https://evil` 就是开放重定向。
 * 前端也校验一次：`onPageReady` 里拿不到服务端的 URL 解析结果。
 */
export function safeRedirect(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback;
}

/**
 * 登录表单行为：防连点 + 站内跳转 + 服务端文案优先。
 *
 * 成功判定兼容三种常见后端约定（三种都遇到过，这里统一兼容）：
 *   - `{ ok: true }`  —— 失败时 `ok: false`
 *   - `{ code: 0 }`   —— .NET 后端常见
 *   - 只看 HTTP 状态   —— body 里这两个字段都没有
 * 错误文案同理，按 `error → detail → message` 取第一个有值的。
 */
export function initLogin(opts: LoginOptions = {}): void {
  const {
    endpoint = '/api/auth/login',
    redirectParam = 'redirect',
    fallback = '/',
    submittingText = '登录中…',
    formId = 'login-form',
    submitId = 'login-submit',
    errorId = 'login-err',
    usernameId = 'login-username',
    passwordId = 'login-password',
  } = opts;

  onPageReady(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const btn = document.getElementById(submitId) as HTMLButtonElement | null;
    const err = document.getElementById(errorId);
    if (!form || !btn || !err) return;
    // 换页后是新元素，标记带不过来；只有同一元素重复注册才需要挡
    if (form.dataset.loginBound === '1') return;
    form.dataset.loginBound = '1';

    const showErr = (text: string) => {
      err.textContent = text;
      err.hidden = false;
    };
    const val = (id: string) =>
      (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // 错误要「过一次就消失」，否则用户改完密码还看到上次的提示
      err.hidden = true;

      // 防连点：登录要跑一次密码哈希，双击等于白吃两次 CPU；
      // 后端若有失败锁定，双击还会加速把自己锁上。
      if (btn.disabled) return;
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = submittingText;

      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            username: val(usernameId).trim(),
            password: val(passwordId),
          }),
        });
        const body = await r.json().catch(() => null);
        const ok =
          r.ok &&
          (body?.ok === true ||
            body?.code === 0 ||
            (body?.ok === undefined && body?.code === undefined));
        if (!ok) {
          // 服务端文案优先：「已锁定 15 分钟」比前端泛泛提示准确
          showErr(
            body?.error ?? body?.detail ?? body?.message ?? `登录失败（HTTP ${r.status}）`,
          );
          return;
        }
        const raw =
          redirectParam === false
            ? null
            : new URLSearchParams(location.search).get(redirectParam);
        // 整页跳转（不要 pushState）—— 需要服务端重新渲染导航与登录态
        location.href = safeRedirect(raw, fallback);
      } catch (ex) {
        showErr(`无法连接服务器：${(ex as Error).message}`);
      } finally {
        // finally 归零：异常路径也不能把按钮永久卡在灰态
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  });
}

/* ── 滚动相关 ─────────────────────────────────────────── */

/**
 * 滚动揭示：给 `.reveal` 元素在进入视口时加 `in`（样式见 motion.css）。
 *
 * ## 两个必须处理的降级
 *
 * 1. **没有 `IntersectionObserver`**（很老的浏览器）→ 直接全部加 `in`。
 *    不处理的话，这些元素因为 CSS 默认 `opacity: 0` 会**永远看不见** ——
 *    "内容凭空消失"比"没有动画"严重得多。
 * 2. **`prefers-reduced-motion: reduce`** → 同理直接全部加 `in`
 *    （CSS 里也已经把 `.reveal` 恢复成可见，这里是双保险）。
 *
 * 已加过 `in` 的元素用 `:not(.in)` 跳过，所以换页后重复调用不会重放动画。
 */
export function initReveal(): void {
  onPageReady(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal:not(.in)');
    if (!els.length) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          // 出现一次就够了，之后不再观察（省掉持续回调）
          io.unobserve(en.target);
        });
      },
      // 下边界内缩 8%：元素刚露头就触发会显得"抢跑"
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
  });
}

export interface BackToTopOptions {
  /** 滚动多少像素后出现。默认 400 */
  showAfter?: number;
  /** 无障碍标签。默认「回到顶部」 */
  label?: string;
}

/**
 * 回到顶部按钮。**按钮由包自己注入**，接入方只需调一次 ——
 * 不必在每个布局里写一遍标记。
 *
 * 行为要点：
 * - 换页后**重新查询**（旧元素已脱离文档），不缓存引用
 * - `prefers-reduced-motion: reduce` 时用瞬时跳转，不做平滑滚动
 * - 滚动监听只绑一次（`window` 级监听换页后仍有效，重复绑会叠加）
 */
export function initBackToTop(opts: BackToTopOptions = {}): void {
  const { showAfter = 400, label = '回到顶部' } = opts;

  // window 级监听**只绑一次** —— 换页不重跑内联脚本，但 window 还在，
  // 反复绑会让一次滚动触发多次
  const w = window as unknown as { __kkBackToTopBound?: boolean };

  const ensureBtn = () => {
    let btn = document.getElementById('back-to-top');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'back-to-top';
      btn.type = 'button';
      btn.className = 'back-to-top';
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.innerHTML = '↑';
      btn.addEventListener('click', () => {
        const reduced =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      });
      document.body.appendChild(btn);
    }
    return btn;
  };

  const sync = () => {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    btn.classList.toggle('is-show', window.scrollY > showAfter);
  };

  onPageReady(() => {
    ensureBtn();
    sync();
  });

  if (w.__kkBackToTopBound) return;
  w.__kkBackToTopBound = true;
  // passive：滚动监听不调 preventDefault，声明 passive 让浏览器不必等回调
  window.addEventListener('scroll', sync, { passive: true });
}

/* ── 装饰性背景 ───────────────────────────────────────── */

export interface MotionBgOptions {
  /** 瓦片尺寸（CSS 长度）。默认 `160px` */
  tile?: string;
  /** 平移一个瓦片（= 一整个循环）所需时间。默认 `30s` */
  speed?: string;
  /** 图案不透明度。默认 `0.2`（暗色主题自动再 ×0.7） */
  opacity?: number;
  /** 元素 id。默认 `motion-bg` */
  id?: string;
}

/**
 * 动态几何图案背景（○ △ X □ 缓慢斜向平移，无缝循环）。
 *
 * 样式全部在 `motion.css` 的 `#motion-bg` 里；这里只负责**注入元素**
 * 与把参数写成 CSS 变量 —— 接入方一行即可，不必在自己布局里写标记。
 *
 * ## 为什么放在 `z-index: -1`
 *
 * 页面底色其实是 `body::before`（同样 `z-index: -1`，画了不透明的
 * `var(--bg)`）。负 z-index 的层按**文档顺序**绘制，而 `::before` 是
 * body 的第一个子级 —— 所以作为 body 子元素的 `#motion-bg` 会**画在它之上**，
 * 又仍在正文之下。不需要为它单独调背景。
 *
 * ## 换页
 *
 * 元素挂在 `body` 上，ClientRouter 换页时会被一起替换 —— 所以走
 * `onPageReady` 重新注入。已存在时只更新变量，不重复创建。
 */
export function initMotionBg(opts: MotionBgOptions = {}): void {
  const { tile, speed, opacity, id = 'motion-bg' } = opts;

  const apply = () => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    if (tile) el.style.setProperty('--motion-bg-tile', tile);
    if (speed) el.style.setProperty('--motion-bg-speed', speed);
    if (typeof opacity === 'number') {
      el.style.setProperty('--motion-bg-opacity', String(opacity));
    }
  };

  onPageReady(apply);
}

/* ── hero 动态取色（公网站点用）───────────────────────── */

export interface HeroTintOptions {
  /** 要采样的图片选择器。默认覆盖 `.hero-banner-img` / `.article-hero-img` */
  selector?: string;
  /** 采样后写入的 CSS 变量名。默认 `--hero-tint` */
  variable?: string;
  /** 采样分辨率。默认 24（24×24 取平均，够用且极快） */
  sampleSize?: number;
}

/**
 * 从 hero 图采样**平均色**写入 CSS 变量（默认 `--hero-tint`）。
 *
 * `base.css` 的 `body::before` 用 `--hero-tint` 画顶部氛围光 ——
 * 采样后氛围光会与封面图同色系，页面看起来"接上了"，
 * 而不是主色硬压在有色调的图上。这是 korikura 观感的关键一环。
 *
 * ## 两个必须处理的失败
 *
 * 1. **图片跨域** → canvas 被污染，`getImageData` 抛 `SecurityError`。
 *    这里整体 try/catch 吞掉：采样失败就退回默认的 `--hero-tint`
 *    （= 主色），页面照常好看，只是氛围光不跟着图走。
 * 2. **图片还没加载完** → 用 `complete`/`naturalWidth` 判断，
 *    没完成就等 `load` 事件（`{ once: true }`，不泄漏监听）。
 *
 * 换页后 hero 是**新元素**，所以走 `onPageReady` 重新采样。
 */
export function initHeroTint(opts: HeroTintOptions = {}): void {
  const {
    selector = '.hero-banner-img, .article-hero-img',
    variable = '--hero-tint',
    sampleSize = 24,
  } = opts;

  const sample = (img: HTMLImageElement) => {
    try {
      const c = document.createElement('canvas');
      c.width = sampleSize;
      c.height = sampleSize;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      // 每 4 个字节一个像素：R G B A
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
      if (!n) return;
      document.documentElement.style.setProperty(
        variable,
        `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`,
      );
    } catch {
      // 跨域污染 canvas（SecurityError）等 —— 静默退回默认色，不影响页面
    }
  };

  onPageReady(() => {
    const img = document.querySelector<HTMLImageElement>(selector);
    if (!img) return;
    if (img.complete && img.naturalWidth) {
      sample(img);
    } else {
      img.addEventListener('load', () => sample(img), { once: true });
    }
  });
}
