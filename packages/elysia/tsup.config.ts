import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  shims: true,
  // mime v4 is ESM-only; bundle it so the CJS output stays requireable
  noExternal: ['mime'],
});
