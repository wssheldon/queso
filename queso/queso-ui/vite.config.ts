import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite({ autoCodeSplitting: true }), viteReact(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
