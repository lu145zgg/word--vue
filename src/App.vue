<template>
  <div class="container">
    <h1>带调试输出的 Word 渲染（Mammoth）</h1>
    <input type="file" accept=".docx" @change="onFileChange" />

    <!-- 渲染区域：如果有 HTML，就用 v-html 显示 -->
    <div v-if="htmlContent" class="docx-container" v-html="htmlContent"></div>
    <p v-else class="tip">请选择一个 .docx 文件，稍等片刻即可看到渲染结果。</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import mammoth from 'mammoth'

// 用来存放转换后的 HTML
const htmlContent = ref('')

async function onFileChange(evt: Event) {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    // 1. 读取文件为二进制 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // 2. 调用 mammoth 转 HTML
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer })

    // 3. 在这里打印出 Mammoth 的原始 HTML 输出，方便调试
    console.log('【Mammoth 输出的 HTML】：', html)

    // 4. 注入页面
    htmlContent.value = html
  }
  catch (err) {
    console.error('Mammoth 解析出错：', err)
    alert('文档解析失败，请查看控制台')
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  font-family: sans-serif;
  padding: 1rem;
}
input[type="file"] {
  margin-top: 1rem;
}
.tip {
  margin-top: 1rem;
  color: #888;
}
.docx-container {
  margin-top: 1.5rem;
  padding: 1rem;
  border: 1px solid #ddd;
  background: #fafafa;
  color: #000
}

.docx-container * {
  color: inherit !important;
}
/* 基本段落间距 */
.docx-container p {
  margin: 0.5em 0;
}
/* 表格样式 */
.docx-container table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
.docx-container th,
.docx-container td {
  border: 1px solid #ccc;
  padding: 0.5em;
}
/* 图片自适应宽度 */
.docx-container img {
  display: block;
  margin: 0.5em auto;
  max-width: 100%;
  height: auto;
}
</style>
