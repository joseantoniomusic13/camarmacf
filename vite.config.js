import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    outDir: 'docs', // Compila dentro de docs/ para poder subirlo y servirlo desde la rama master
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
