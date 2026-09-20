import { defineConfig } from 'vite';

export default defineConfig(({}) => ({
  base: '/countdown-timer/', // GitHub Pages project path
  build: {
    outDir: 'dist',
  }
}));
