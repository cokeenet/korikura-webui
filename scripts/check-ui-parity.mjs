#!/usr/bin/env node
/**
 * 检查「孪生组件」的标记契约是否一致。
 *
 * ## 为什么需要它
 *
 * React 岛屿无法引用 `.astro` 组件，所以凡是两种都要用的原语
 * 必然存在两份（`X.astro` + `X.tsx`）。两份只要有一边改了类名或文案，
 * 同一个站点里 SSR 页和岛屿就会**显示成两种样子** —— 而这不会报错、
 * 不会被构建拦住，只能靠人眼发现。
 *
 * 实际已经发生过一次：接入方复制 `.tsx` 时顺手把内联样式改成了类名，
 * 包这边毫无察觉。
 *
 * ## 检查什么
 *
 * 1. 成对存在（有 `.astro` 就该有 `.tsx`，反之亦然）
 * 2. **class 名集合**一致
 * 3. **字面量文案**一致（默认标题、提示语等）
 *
 * 用法：`node scripts/check-ui-parity.mjs`（CI / 提交前跑）
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/components/ui');

/** 取出一个文件里的 class 名集合。
 *  `class="a b"` / `className={`a b-${t}`}` → {a, b} （占位符那截丢掉） */
function classNames(src) {
  const out = new Set();
  src = stripComments(src);
  const re = /class(?:Name)?=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
  for (const m of src.matchAll(re)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? '';
    // 去掉插值与其后粘连的部分：`badge badge-${tone}` → badge, badge-
    const cleaned = raw.replace(/\$\{[^}]*\}/g, ' ');
    for (const tok of cleaned.split(/\s+/)) {
      const t = tok.trim().replace(/[{}`'"]/g, '');
      if (t && !t.includes('$')) out.add(t);
    }
  }
  return out;
}

/** 剥掉注释 —— 注释里也会出现中文，不剥就会把文档当成文案来比对（误报）。 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // /* */ 与 /** */
    .replace(/<!--[\s\S]*?-->/g, ' ') // <!-- -->
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // 行注释（放过 https://）
}

/** 取出字面量文案：单/双引号里的中文串（默认值、提示语）。 */
function literals(src) {
  const out = new Set();
  src = stripComments(src);
  for (const m of src.matchAll(/(['"])([^'"\n]*[\u4e00-\u9fa5][^'"\n]*)\1/g)) {
    out.add(m[2].trim());
  }
  return out;
}

const files = readdirSync(dir);
const bases = [...new Set(files.map((f) => f.replace(/\.(astro|tsx)$/, '')))];

let failed = 0;
const diff = (a, b) => [...a].filter((x) => !b.has(x));

for (const base of bases) {
  const astro = join(dir, `${base}.astro`);
  const tsx = join(dir, `${base}.tsx`);
  const hasAstro = files.includes(`${base}.astro`);
  const hasTsx = files.includes(`${base}.tsx`);

  if (hasAstro !== hasTsx) {
    console.error(
      `✗ ${base}: 只有 ${hasAstro ? '.astro' : '.tsx'} —— 孪生组件必须成对（SSR 与岛屿各要一份）`,
    );
    failed++;
    continue;
  }

  const a = readFileSync(astro, 'utf8');
  const t = readFileSync(tsx, 'utf8');
  const ca = classNames(a);
  const ct = classNames(t);
  const la = literals(a);
  const lt = literals(t);

  const missInTsx = diff(ca, ct);
  const missInAstro = diff(ct, ca);
  const textInTsxOnly = diff(lt, la);
  const textInAstroOnly = diff(la, lt);

  const problems = [];
  if (missInTsx.length)
    problems.push(`  .tsx 缺 class: ${missInTsx.join(', ')}`);
  if (missInAstro.length)
    problems.push(`  .astro 缺 class: ${missInAstro.join(', ')}`);
  if (textInTsxOnly.length)
    problems.push(`  .tsx 多出文案: ${textInTsxOnly.join(' / ')}`);
  if (textInAstroOnly.length)
    problems.push(`  .astro 多出文案: ${textInAstroOnly.join(' / ')}`);

  if (problems.length) {
    console.error(`✗ ${base} 孪生不一致：`);
    console.error(problems.join('\n'));
    failed++;
  } else {
    console.log(
      `✓ ${base}: ${ca.size} 个 class / ${la.size} 条文案，两份一致`,
    );
  }
}

if (failed) {
  console.error(
    `\n${failed} 组不一致。两份必须同标记、同类名、同默认文案 ——` +
      `\n否则同一个站点里 SSR 页与 React 岛屿会长得不一样。`,
  );
  process.exit(1);
}
console.log(`\n全部 ${bases.length} 组孪生组件一致。`);
