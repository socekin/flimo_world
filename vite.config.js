import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 热更新配置
    hmr: {
      overlay: true, // 显示错误覆盖层
    },
    proxy: {
      '/npc-api': {
        target: 'http://74.48.180.54:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/npc-api/, '')
      }
    },
    // 监听文件变化
    watch: {
      usePolling: true, // 使用轮询确保文件变化被检测到
      interval: 100, // 轮询间隔（毫秒）
    },
  },
  // 强制预构建依赖
  optimizeDeps: {
    force: true,
  },
})
