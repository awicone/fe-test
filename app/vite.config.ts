import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api-rs.dexcelerate.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // WebSocket proxy will be used later for ws
      // '/ws': {
      //   target: 'wss://api-rs.dexcelerate.com/ws',
      //   ws: true,
      //   changeOrigin: true,
      // },
    },
  },
})
