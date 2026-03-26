import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  minify: true,
  treeshake: true,
  target: 'es2015',
  splitting: false,
  external: ['svelte', 'svelte/store'],
});
