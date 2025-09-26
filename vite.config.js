import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Force bundling of all dependencies to prevent chunk splitting
    include: ['react', 'react-dom', 'react-dom/client']
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/js/main.jsx'),
        pi: resolve(__dirname, 'src/js/pi.jsx'),
        setup: resolve(__dirname, 'src/js/setup.jsx'),
        form: resolve(__dirname, 'src/js/form.jsx')
      },
      output: {
        entryFileNames: `js/[name].js`,
        chunkFileNames: `js/[name]-[hash].js`,
        assetFileNames: `assets/[name][extname]`,
        format: 'es',
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000
  },
  define: {
    global: 'globalThis',
  }
})