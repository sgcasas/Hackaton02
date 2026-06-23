import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// El proxy de /api permite que en dev local las llamadas a la API sean same-origin
// (mismo mecanismo que el rewrite de vercel.json en deploy), evitando CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://hackaton-20261-front-587720740455.us-east1.run.app',
        changeOrigin: true,
      },
    },
  },
})
