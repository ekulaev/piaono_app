import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Проект публикуется как GitHub Pages project site: https://<user>.github.io/piaono_app/
export default defineConfig({
  base: '/piaono_app/',
  plugins: [react()],
})
