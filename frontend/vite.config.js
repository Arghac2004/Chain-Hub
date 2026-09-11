import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Custom plugin: tell Rollup to parse .js files as JSX */
function jsxInJs() {
  return {
    name: 'jsx-in-js',
    config() {
      return {
        esbuild: {
          loader: 'jsx',
          include: /src\/.*\.js$/,
          exclude: [],
        },
        optimizeDeps: {
          esbuildOptions: {
            loader: { '.js': 'jsx' },
          },
        },
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    jsxInJs(),
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
