import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build: production - backend: n8n-whatsapp-backend.zscidy.easypanel.host
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
})