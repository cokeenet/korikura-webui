import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: { plugins: [tailwind()] },
});
