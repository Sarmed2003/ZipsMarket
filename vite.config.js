import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vercel Serverless Functions live under /api. Vite doesn't serve them.
    // If you're testing Stripe locally, run `npx vercel dev --listen 3000`
    // and this proxy will forward /api/* to it.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
