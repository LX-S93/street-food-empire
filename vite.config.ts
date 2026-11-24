import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages (/street-food-empire/) and as a claude.ai artifact.
export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
});
