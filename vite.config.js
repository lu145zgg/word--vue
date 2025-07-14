import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'    




            // ← 新增

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {                          // ← 新增整个 resolve 配置
    alias: {
      // 当你在代码里写 import docx4js 时，
      // 实际上会加载到本地源码编译后的 lib/index.js
      'docx4js': path.resolve(
        __dirname,
        '../docx4js/lib/index.js'     // ← 根据你本地目录结构调整这段相对路径
      )
    }
  }
})
