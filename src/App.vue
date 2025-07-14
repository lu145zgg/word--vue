<template>
  <div class="container">
    <h1>DOCX Preview 完整渲染示例</h1>
    <input type="file" accept=".docx" @change="onFileChange" />

    <!-- 渲染容器 -->
    <div ref="viewer" class="docx-viewer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { renderAsync } from 'docx-preview'

const viewer = ref<HTMLElement | null>(null)

async function onFileChange(evt: Event) {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !viewer.value) return

  try {
    // 1. 读取二进制
    const arrayBuffer = await file.arrayBuffer()

    // 2. 清空上次渲染内容
    viewer.value.innerHTML = ''

    // 3. 调用 docx-preview 渲染到容器（不传第三个参数）
    await renderAsync(arrayBuffer, viewer.value)

    console.log('渲染完成')
  }
  catch (err) {
    console.error('docx-preview 渲染出错：', err)
    alert('渲染失败，请查看控制台')
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
/* 渲染区滚动容器 */
.docx-viewer {
  margin-top: 1rem;
  max-height: 80vh;
  overflow: auto;
}

/* 表格样式 */
.docx-viewer table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
.docx-viewer th,
.docx-viewer td {
  border: 1px solid #ccc;
  padding: 4px;
}

/* 段落和列表间距 */
.docx-viewer p {
  margin: 0.5em 0;
}
.docx-viewer ul,
.docx-viewer ol {
  margin: 0.5em 0 0.5em 1.5em;
}

/* 图片自适应 */
.docx-viewer img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.5em auto;
}
</style>
