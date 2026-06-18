import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // VITE_API_BASE_URL and VITE_API_KEY set in Netlify env vars
})
