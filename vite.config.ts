import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 開發時(pnpm dev)把 /api 轉給本機後端;正式環境由 nginx 轉,不經過這裡。
    // 原本寫成 "/api": "/api",那不是有效的目標位址,開發模式下所有 API 都會失敗。
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
})
