import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    proxy: {
      '/api/github': {
        target: 'https://github-stats.tashif.codes',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/github/, ''),
      },
      '/api/leetcode': {
        target: 'https://leetcode-stats.tashif.codes',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/leetcode/, ''),
      },
      '/api/codeforces': {
        target: 'https://codeforces-stats.tashif.codes',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/codeforces/, ''),
      },
      '/api/gfg': {
        target: 'https://gfg-stats.tashif.codes',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gfg/, ''),
      },
      '/api/codechef': {
        target: 'https://codechef-stats.tashif.codes',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/codechef/, ''),
      },
      '/api/hackerrank': {
        target: 'https://hackerrank-stats.tashif.codes',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hackerrank/, ''),
      },
      '/api/tuf': {
        target: 'https://tuf-stats.tashif.codes',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tuf/, ''),
      },
      '/ph': {
        target: 'https://eu.i.posthog.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ph/, ''),
      },
    },
  },
  optimizeDeps: {
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
