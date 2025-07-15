<template>
  <div class="container">
    <h1>多行文本检测 & Inline 高亮示例</h1>

    <!-- 上传 .docx -->
    <div class="controls">
      <input type="file" accept=".docx" @change="onFileUpload" />
    </div>

    <!-- 多行输入 -->
    <div class="controls">
      <textarea
        v-model="targetText"
        placeholder="在这里粘贴要匹配的多行文本，每行都会单独高亮"
        rows="4"
      ></textarea>
      <button @click="applyHighlight">高亮匹配</button>
    </div>

    <!-- 渲染容器 -->
    <div ref="viewer" class="docx-viewer"></div>
  </div>
</template>

<script setup>
// 彻底屏蔽 Volar TS 报错
// @ts-nocheck

import { ref, nextTick } from 'vue'
import { renderAsync } from 'docx-preview'

// Vue refs
const viewer    = ref(null)
const targetText = ref(`第一行要匹配的内容
第二行要匹配的内容
…可以无上限`)
let rawHtml = ''

/** 上传并渲染文档 */
async function onFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file || !viewer.value) return
  

  const buffer = await file.arrayBuffer()
  viewer.value.innerHTML = ''
  await renderAsync(buffer, viewer.value)
  await nextTick()
  // 保存渲染后的 HTML
  rawHtml = viewer.value.innerHTML
}

/** 转义正则特殊字符 */
function escapeRegExp(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

/** 构建允许任意空白的正则 */
function buildFlexibleRegex(str) {
  return new RegExp(
    str.trim().split(/\s+/).map(escapeRegExp).join('\\s*'),
    'gi'
  )
}

/**
 * 对一个“行”文本做 inline 高亮：
 * 用 TreeWalker 找到所有匹配该行的文本节点，
 * 然后拆分并插入 <span class="highlight">。
 */
function highlightLine(line, url) {
  const re = buildFlexibleRegex(line)
  const walker = document.createTreeWalker(
    viewer.value,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return re.test(node.nodeValue || '')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
      }
    }
  )
  const textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)

  textNodes.forEach(textNode => {
    const txt = textNode.nodeValue || ''
    let last = 0
    const frag = document.createDocumentFragment()

    txt.replace(re, (match, offset) => {
      // 普通文字
      frag.appendChild(document.createTextNode(txt.slice(last, offset)))
      // 高亮部分
      const span = document.createElement('span')
      span.className = 'highlight'
      span.textContent = match
      span.onclick = () => window.open(url, '_blank')
      frag.appendChild(span)
      last = offset + match.length
      return match
    })
    // 最后尾部
    frag.appendChild(document.createTextNode(txt.slice(last)))
    textNode.parentNode.replaceChild(frag, textNode)
  })
}

/** 恢复原始并对每行依次高亮 */
async function applyHighlight() {
  if (!viewer.value) return alert('请先上传并渲染文档')
  // 恢复干净的 HTML
  viewer.value.innerHTML = rawHtml
  await nextTick()

  // 拆分成多行，去掉空白行
  const lines = targetText.value
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  // 对每行依次执行 inline 高亮
  lines.forEach(line => highlightLine(line, 'https://example.com/details'))
}
</script>

<style>
.container {
  max-width: 800px;
  margin: 2rem auto;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
textarea {
  flex: 1;
  font-family: inherit;
  padding: 0.5rem;
}
button {
  padding: 0.5rem 1rem;
}
.docx-viewer {
  border: 1px solid #ddd;
  padding: 1rem;
  max-height: 70vh;
  overflow: auto;
  background: #fafafa;
}
/* 基本表格、段落样式略…… */
/* inline 高亮样式（全局） */
.highlight {
  background: rgba(255, 200, 200, 0.8);
  color: #c00;
  font-weight: bold;
  padding: 0 2px;
  border-radius: 2px;
  cursor: pointer;
}
.highlight:hover {
  background: rgba(255, 150, 150, 1);
}
</style>
