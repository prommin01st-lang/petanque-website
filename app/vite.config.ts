import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: '/',
  // inspectAttr adds code-path="…" attributes for dev tooling; never ship them.
  plugins: command === 'serve' ? [inspectAttr(), react()] : [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
      '/uploads': 'http://localhost:8080',
      '/rss.xml': 'http://localhost:8080',
      '/sitemap.xml': 'http://localhost:8080',
      '/robots.txt': 'http://localhost:8080',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Long-lived framework code in its own chunk: better caching, and keeps the app entry < 500 kB.
        manualChunks: { react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'] },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
