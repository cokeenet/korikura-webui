/**
 * 图表模块统一出口。
 *
 * 也可以按文件单独引入（`korikura-webui/charts/Sparkline.tsx`），
 * 那样只会把用到的那一个组件打进产物。
 */
export { default as Sparkline } from './Sparkline.tsx';
export { default as AreaChart } from './AreaChart.tsx';
export { default as BarChart } from './BarChart.tsx';

export type { SparklineProps } from './Sparkline.tsx';
export type { AreaChartProps, ChartSeries, ChartTone } from './AreaChart.tsx';
export type { BarChartProps, BarItem, BarTone } from './BarChart.tsx';

export * from './scale.ts';
export * from './path.ts';
