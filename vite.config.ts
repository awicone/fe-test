import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Для GitHub Pages (project pages): https://awicone.github.io/fe-test/
  // Указываем базовый путь, чтобы ссылки на ассеты были корректны
  base: '/fe-test/',
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
