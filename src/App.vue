<template>
  <div class="container">
    <h1>Word 文档在线渲染（Mammoth）</h1>
    <input type="file" accept=".docx" @change="onFileChange" />

    <!-- 如果 htmlContent 非空，就用 v-html 渲染 -->
    <div v-if="htmlContent" class="docx-container" v-html="htmlContent"></div>

    <!-- 如果没选文件时，给个提示 -->
    <p v-else class="tip">请选择一个 .docx 文件，稍等片刻即可看到渲染结果</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import mammoth from 'mammoth'

const htmlContent = ref('')

async function onFileChange(evt) {
  const file = evt.target.files[0]
  if (!file) return

  try {
    // 1. 读取文件为二进制 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // 2. 调用 mammoth 转 HTML
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer })

    // 3. 将生成的 HTML 注入页面
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
</style>
