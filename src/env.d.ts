/// <reference types="vite/client" />

// 允许直接从 .vue 文件默认导入组件
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明 Volar 自动注入的所有内部命名空间，防止 ts-plugin 报错
declare global {
  namespace __VLS_GlobalComponents {}
  namespace __VLS_PickNotAny {}
  namespace __VLS_intrinsicElements {}
  // 如有其它 __VLS_xxx 报错，再在这里声明即可
}

export {}
