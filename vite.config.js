import { defineConfig } from 'vite'

export default defineConfig({
  base: '/telegram-game1/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
