import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Базовый путь задаём через env: для GH Pages '/fe-test/', для CF Pages '/'
  base: (globalThis as any).process?.env?.APP_BASE || '/fe-test/',
  server: {
    proxy: {
      '/api': {
        target: 'https://api-rs.dexcelerate.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
