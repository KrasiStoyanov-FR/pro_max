import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: parseInt(process.env.VITE_PORT || process.env.PORT || '3000', 10),
    host: process.env.VITE_HOST === 'true' || process.env.VITE_HOST === undefined,
    allowedHosts: ['dds.pm99.site'],
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  css: {
    postcss: './postcss.config.js'
  },
  cacheDir: '.vite',
  optimizeDeps: {
    exclude: ['js-big-decimal'],
    include: ['@vuepic/vue-datepicker']
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          map: ['leaflet']
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
})

