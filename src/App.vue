<template>
  <div class="container">
    <h1>跨段落连体文本高亮（手动拆分版）</h1>

    <div class="controls">
      <label>1. 上传 Word 文件：</label>
      <input type="file" accept=".docx" @change="onFileUpload" />
    </div>

    <div class="controls">
      <label>2. 输入要匹配的连续区块：</label>
      <textarea
        v-model="targetText"
        placeholder="粘贴一段跨多个段落的连体文本"
        rows="4"
      ></textarea>
      <button @click="applyHighlight">高亮匹配</button>
    </div>

    <div ref="viewer" class="docx-viewer"></div>
  </div>
</template>

<script setup>
// @ts-nocheck
import { ref, nextTick } from 'vue'
import { renderAsync } from 'docx-preview'

const viewer = ref(null)
const targetText = ref('')
let rawHtml = ''

// 上传并渲染
async function onFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file || !viewer.value) return
  const buf = await file.arrayBuffer()

  // 使用 docx-preview 渲染 Word 文档内容
  viewer.value.innerHTML = ''
  await renderAsync(buf, viewer.value)

  await nextTick()
  rawHtml = viewer.value.innerHTML

  // 处理分页符
  handlePagination()
}

// 构造允许任意空白的正则
function escapeRegExp(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function buildRegex(str) {
  return new RegExp(
    str.trim().split(/\s+/).map(escapeRegExp).join('\\s*'),
    'gi'
  )
}

// 收集所有文本节点
function collectTextNodes(root) {
  const nodes = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let charCount = 0, node
  while ((node = walker.nextNode())) {
    const len = node.nodeValue.length
    nodes.push({ node, start: charCount, end: charCount + len })
    charCount += len
  }
  return { nodes, totalLength: charCount }
}

// 高亮匹配文本
function highlightByRange(nodes, idx, len, url) {
  const end = idx + len
  // 为不破坏后面节点的偏移，倒序处理匹配范围内的节点
  for (let i = nodes.length - 1; i >= 0; i--) {
    const { node, start, end: nodeEnd } = nodes[i]
    if (nodeEnd <= idx || start >= end) continue
    const text = node.nodeValue
    const localS = Math.max(0, idx - start)
    const localE = Math.min(text.length, end - start)
    // 构建新片段：prefix + <span>match</span> + suffix
    const frag = document.createDocumentFragment()
    if (localS > 0) frag.appendChild(document.createTextNode(text.slice(0, localS)))
    const span = document.createElement('span')
    span.className = 'highlight'
    span.textContent = text.slice(localS, localE)
    span.onclick = () => window.open(url, '_blank')
    frag.appendChild(span)
    if (localE < text.length) frag.appendChild(document.createTextNode(text.slice(localE)))
    node.parentNode.replaceChild(frag, node)
  }
}

async function applyHighlight() {
  if (!viewer.value) return alert('请先上传并渲染文档')

  // 恢复原始 HTML
  viewer.value.innerHTML = rawHtml
  await nextTick()

  // 收集文本节点并构造扁平文本
  const { nodes, totalLength } = collectTextNodes(viewer.value)
  let flat = ''
  nodes.forEach(({ node }) => { flat += node.nodeValue })

  // 在 flat 上全局搜所有匹配
  const re = buildRegex(targetText.value)
  let m
  const matches = []
  while ((m = re.exec(flat)) !== null) {
    matches.push({ idx: m.index, len: m[0].length })
  }

  if (!matches.length) {
  
    return alert('未找到匹配文本')
  }

  // 倒序高亮每个匹配，防止替换后影响后续偏移
  matches.reverse().forEach(({ idx, len }) =>
    highlightByRange(nodes, idx, len, 'https://example.com/details')
  )
}

// 处理分页符：将分页符替换为 ------------ 
function handlePagination() {
  // 替换所有分页符
  viewer.value.innerHTML = viewer.value.innerHTML.replace(/<div class="page-break">/g, '<div class="page-break">------------</div>');
}
</script>

<style>
.container {
  max-width: 100%;
  margin: 0 auto;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.controls {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

textarea {
  flex: 1;
  padding: 0.5rem;
  font-family: inherit;
  width: 100%;
  height: 200px;
}

button {
  padding: 0.5rem 1rem;
}

.docx-viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #fafafa;
  width: 100%;
  min-height: 100vh;
  overflow: hidden; /* 去除滚动条 */
}

.docx-viewer p {
  margin: 10px 0;
  padding: 15px;
  border-radius: 8px;
  line-height: 1.6;
}

/* 为分页符设置样式 */
.page-break {
  display: block;
  text-align: center;
  margin: 20px 0;
  color: gray;
  font-weight: bold;
}

.highlight {
  background: rgba(255,200,200,0.8);
  color: #c00;
  font-weight: bold;
  padding: 0 2px;
  border-radius: 2px;
  cursor: pointer;
}

.highlight:hover {
  background: rgba(255,150,150,1);
}
</style>
