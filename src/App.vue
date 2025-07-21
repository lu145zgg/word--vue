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
import { ref, nextTick } from 'vue'
import { renderAsync } from 'docx-preview'

const viewer = ref(null)
const targetText = ref('')
let rawHtml = ''
let highlightId = 0 // 用于跟踪匹配的高亮组

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

  // 处理表格渲染
  handleTableRendering()
}

// 处理表格渲染
function handleTableRendering() {
  const tables = viewer.value.querySelectorAll('table')
  tables.forEach(table => {
    // 设置表格样式
    table.style.borderCollapse = 'collapse'
    const cells = table.querySelectorAll('td, th')
    cells.forEach(cell => {
      cell.style.padding = '8px'
      cell.style.border = '1px solid #ddd'
    })
  })
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
function highlightByRange(nodes, idx, len, groupId) {
  const end = idx + len
  // 倒序处理，以防止文本替换后影响后续节点
  for (let i = nodes.length - 1; i >= 0; i--) {
    const { node, start, end: nodeEnd } = nodes[i]
    if (nodeEnd <= idx || start >= end) continue
    const text = node.nodeValue
    const localS = Math.max(0, idx - start)
    const localE = Math.min(text.length, end - start)
    // 构建新的片段：前缀 + <span>匹配内容</span> + 后缀
    const frag = document.createDocumentFragment()
    if (localS > 0) frag.appendChild(document.createTextNode(text.slice(0, localS)))
    const span = document.createElement('span')
    span.className = `highlight group-${groupId}`
    span.textContent = text.slice(localS, localE)
    frag.appendChild(span)
    if (localE < text.length) frag.appendChild(document.createTextNode(text.slice(localE)))
    node.parentNode.replaceChild(frag, node)
  }
}

// 高亮表格中的单元格
function highlightTableCells(table, idx, len, groupId) {
  const cells = table.querySelectorAll('td, th')
  cells.forEach(cell => {
    const node = cell.firstChild // 假设文本在第一个子节点
    if (node && node.nodeValue) {
      const text = node.nodeValue
      let matchIndex = text.indexOf(targetText.value) // 查找匹配的文本
      if (matchIndex !== -1) {
        highlightByRange([{ node, start: 0, end: text.length }], matchIndex, len, groupId)
      }
    }
  })
}

// 高亮应用逻辑
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

  // 创建一个唯一的高亮组ID
  highlightId++

  // 倒序高亮每个匹配
  matches.reverse().forEach(({ idx, len }) => {
    // 高亮文本节点
    highlightByRange(nodes, idx, len, highlightId)

    // 高亮表格单元格
    const tables = viewer.value.querySelectorAll('table')
    tables.forEach(table => {
      highlightTableCells(table, idx, len, highlightId)
    })
  })

  // 添加事件监听器，当鼠标悬停时，所有同组的高亮一起变红
  const highlightElements = document.querySelectorAll(`.group-${highlightId}`)
  highlightElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      document.querySelectorAll(`.group-${highlightId}`).forEach(highlightedEl => {
        highlightedEl.style.backgroundColor = 'rgba(255, 0, 0, 0.8)'
        highlightedEl.style.color = 'white'
      })
    })
    el.addEventListener('mouseleave', () => {
      document.querySelectorAll(`.group-${highlightId}`).forEach(highlightedEl => {
        highlightedEl.style.backgroundColor = 'rgba(255, 200, 200, 0.8)'
        highlightedEl.style.color = '#c00'
      })
    })
  })
}

// 处理分页符：将分页符替换为 A4 分页样式
function handlePagination() {
  const pageBreaks = viewer.value.querySelectorAll('.page-break')
  pageBreaks.forEach(page => {
    page.style.pageBreakBefore = 'always'; // 强制分页
  })
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
  background-color: #ffffff; /* 去除灰色背景 */
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
}

/* A4 纸样式 */
.docx-wrapper {
  width: 100%; /* 宽度设为100%，以适应容器大小 */
  margin: 0 auto;
  padding: 15mm;
  border: 0px solid #ffffff;
  box-sizing: border-box;
  background: #ffffff; /* 这里去除了灰色背景，设为白色 */
}

/* 保证去除父级容器的任何背景颜色 */
.docx-wrapper, .docx-viewer {
  background-color: transparent !important;
}

.page-break {
  display: block;
  text-align: center;
  margin: 20px 0;
  font-weight: bold;
  padding-top: 10px;
  color: #000; /* 设置分页符文本颜色 */
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

/* 默认高亮效果 */
.highlight:hover,
.group-1 .highlight,
.group-2 .highlight {
  background: rgba(255, 100, 100, 1);
  color: #ff0000;
}
</style>
