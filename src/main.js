import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
// 全局样式
import './style.css'
// Element Plus 样式
import 'element-plus/dist/index.css'

// 先获取 app 实例
const app = createApp(App)

// 安装 Element Plus
app.use(ElementPlus)

// 最后挂载
app.mount('#app')
