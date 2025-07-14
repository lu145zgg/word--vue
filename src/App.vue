<template>
  <div style="padding:2rem;font-size:1.2rem;">
    <h1>Word 文档在线渲染</h1>

    <!-- 上传框恢复 -->
    <input type="file" accept=".docx" @change="onFileChange" />

    <!-- 这里始终显示，用来验证触发 -->
    <div style="margin-top:1rem;color:#666;">
      选中文件后，Console 会看到日志
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 暂时用来保存文件名
const fileName = ref('');

function onFileChange(evt) {
  const f = evt.target.files[0];
  if (!f) return;
  fileName.value = f.name;
  console.log('文件选中了：', f);
}
</script>

<style scoped>
/* 简单样式，可以不动 */
</style>
