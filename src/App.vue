


<template>



  <div class="container">
    <h1>Word 文档在线渲染</h1>

    <!-- 选择文件 -->
    <input type="file" accept=".docx" @change="onFileChange" />

    <!-- 渲染区 -->
    <div v-if="vnodes.length" class="docx-container">
      <!-- ① 这里改成 <component>…</component> 而不是自闭合 -->
      <component
        v-for="(node, idx) in vnodes"
        :key="idx"
        :is="node"
      ></component>
    </div>
  </div>
</template>

<script setup>
import docx4js from 'docx4js';
import { ref, h } from 'vue';
import docx4js from 'docx4js';

const vnodes = ref([]);

async function onFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const doc = await docx4js.load(file);
    const tree = doc.render((type, props, children) => {
      let tag;
      switch (type) {
        case 'p':     tag = 'p';    break;
        case 'r':     tag = 'span'; break;
        case 't':     tag = '';     break;
        case 'table': tag = 'table';break;
        case 'row':   tag = 'tr';   break;
        case 'cell':  tag = 'td';   break;
        default:      tag = 'div';  break;
      }
      if (tag === '') {
        return children;
      }
      const style = {};
      if (props && props.style) {
        if (props.style['font-weight'] === 'bold') style.fontWeight = 'bold';
        if (props.style['font-style']  === 'italic') style.fontStyle  = 'italic';
      }
      return h(tag, { ...props, style }, children);
    });
    vnodes.value = Array.isArray(tree) ? tree : [tree];
  }
  catch (err) {
    console.error('解析失败', err);
    alert('文档解析出错，请看控制台');
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  font-family: sans-serif;
}
.docx-container {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #eee;
}
.docx-container p {
  margin: 0.5em 0;
}
.docx-container table {
  width: 100%;
  border-collapse: collapse;
}
.docx-container td {
  border: 1px solid #ccc;
  padding: 0.5em;
}
</style>
