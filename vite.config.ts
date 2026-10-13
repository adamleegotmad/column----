import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // 忽略编辑工具原子写入产生的临时目录（Windows 下 watch 这些被锁定的临时文件会让 Vite 崩溃 EBUSY）
      ignored: ['**/.*.tmpdir/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})