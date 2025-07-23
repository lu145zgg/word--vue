<template>
  <div class="container">
    <h1>Word转html（手动高亮）</h1>

    <!-- 1. 上传 Word 文件 -->
    <div class="controls">
      <label>1. 上传 Word 文件：</label>
      <input
        ref="fileInput"
        type="file"
        accept=".docx"
        @change="onFileUpload"
        style="display: none;"
      />
      <el-button type="primary" plain @click="onSelectFile">
        选择文件
      </el-button>
    </div>

    <!-- 2. 从后端加载已上传文件 -->
    <div class="controls">
      <label>2. 从后端加载文件：</label>
      <el-select
        v-model="selectedUrl"
        placeholder="请选择后端文件"
        style="min-width: 240px;"
        @change="onSelectBackendFile"
      >
        <el-option
          v-for="item in fileList"
          :key="item.url"
          :label="item.filename"
          :value="item.url"
        />
      </el-select>
    </div>

    <!-- 3. 文本匹配 & 高亮 -->
    <div class="controls">
      <label>3. 输入要匹配的连续区块：</label>
      <el-input
        type="textarea"
        v-model="targetText"
        :rows="4"
        placeholder="粘贴一段跨多个段落的连体文本"
      />
      <el-button type="primary" plain @click="applyHighlight">
        高亮匹配
      </el-button>
    </div>

    <!-- 渲染区域 -->
    <div ref="viewer" class="docx-viewer"></div>
  </div>
</template>





<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { renderAsync } from 'docx-preview'

const fileInput   = ref(null)
const viewer      = ref(null)
const targetText  = ref('')
const fileList    = ref([])   // 后端文件列表
const selectedUrl = ref('')    // 选中的后端文件 URL

// 点击高亮后要跳转到的目标网址
const targetUrl = 'https://your.target.url/path'

let rawHtml     = ''
let highlightId = 0  // 用于跟踪匹配的高亮组

// 触发本地文件选择
function onSelectFile() {
  fileInput.value?.click()
}

// 本地文件上传到后端并渲染
async function onFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return

  const form = new FormData()
  form.append('file', file)

  try {
    const { data } = await axios.post('/api/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    // 上传成功，刷新列表并渲染
    await fetchFileList()
    await fetchAndRender(data.url)
  } catch (err) {
    console.error(err)
    alert('上传失败')
  }
}

// 从后端拉取文件列表
async function fetchFileList() {
  try {
    const { data } = await axios.get('/api/files')
    fileList.value = data.files
  } catch (err) {
    console.error(err)
  }
}

// 用户从下拉选中后端文件
async function onSelectBackendFile(url) {
  if (!url) return
  await fetchAndRender(url)
}

// 下载二进制并渲染
async function fetchAndRender(url) {
  if (!viewer.value) return

  // fetch 二进制
  const resp = await fetch(url)
  const buf  = await resp.arrayBuffer()

  // 用 docx-preview 渲染
  viewer.value.innerHTML = ''
  await renderAsync(buf, viewer.value)
  await nextTick()

  rawHtml = viewer.value.innerHTML
  handlePagination()
  handleTableRendering()
}

// 处理表格样式
function handleTableRendering() {
  viewer.value.querySelectorAll('table').forEach(table => {
    table.style.borderCollapse = 'collapse'
    table.querySelectorAll('td, th').forEach(cell => {
      cell.style.padding = '8px'
      cell.style.border  = '1px solid #ddd'
    })
  })
}

// 处理分页符
function handlePagination() {
  viewer.value.querySelectorAll('.page-break').forEach(pb => {
    pb.style.pageBreakBefore = 'always'
  })
}

function escapeRegExp(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function buildRegex(str) {
  return new RegExp(
    str.trim().split(/\s+/).map(escapeRegExp).join('\\s*'),
    'gi'
  )
}

function collectTextNodes(root) {
  const nodes  = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let charCount = 0, node
  while ((node = walker.nextNode())) {
    const len = node.nodeValue.length
    nodes.push({ node, start: charCount, end: charCount + len })
    charCount += len
  }
  return { nodes }
}

function highlightByRange(nodes, idx, len, groupId) {
  const endPos = idx + len
  for (let i = nodes.length - 1; i >= 0; i--) {
    const { node, start, end } = nodes[i]
    if (end <= idx || start >= endPos) continue
    const text = node.nodeValue
    const localS = Math.max(0, idx - start)
    const localE = Math.min(text.length, endPos - start)

    const frag = document.createDocumentFragment()
    if (localS > 0) frag.appendChild(document.createTextNode(text.slice(0, localS)))

    const span = document.createElement('span')
    span.className   = `highlight group-${groupId}`
    span.textContent = text.slice(localS, localE)
    frag.appendChild(span)

    if (localE < text.length) frag.appendChild(document.createTextNode(text.slice(localE)))
    node.parentNode.replaceChild(frag, node)
  }
}

function highlightTableCells(table, idx, len, groupId) {
  table.querySelectorAll('td, th').forEach(cell => {
    const node = cell.firstChild
    if (node?.nodeValue) {
      const text = node.nodeValue.toLowerCase()
      const mi   = text.indexOf(targetText.value.trim().toLowerCase())
      if (mi !== -1) {
        highlightByRange([{ node, start: 0, end: text.length }], mi, len, groupId)
      }
    }
  })
}

async function applyHighlight() {
  if (!viewer.value) {
    return alert('请先上传并渲染文档')
  }

  // 恢复原始内容
  viewer.value.innerHTML = rawHtml
  await nextTick()

  // 收集文本并匹配
  const { nodes } = collectTextNodes(viewer.value)
  const flat      = nodes.map(n => n.node.nodeValue).join('')
  const re        = buildRegex(targetText.value)
  let m, matches  = []
  while ((m = re.exec(flat))) {
    matches.push({ idx: m.index, len: m[0].length })
  }
  if (!matches.length) {
    return alert('未找到匹配文本')
  }

  // 执行高亮
  highlightId++
  matches.reverse().forEach(({ idx, len }) => {
    highlightByRange(nodes, idx, len, highlightId)
    viewer.value.querySelectorAll('table').forEach(table => {
      highlightTableCells(table, idx, len, highlightId)
    })
  })

  // 等待 DOM 更新，再自动滚动到第一处高亮
  await nextTick()
  const firstEl = viewer.value.querySelector(`.group-${highlightId}`)
  if (firstEl) {
    firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // 为所有高亮元素添加交互：鼠标悬停变色 & 点击跳转
  viewer.value.querySelectorAll(`.group-${highlightId}`).forEach(el => {
    el.addEventListener('mouseenter', () => {
      viewer.value.querySelectorAll(`.group-${highlightId}`).forEach(e => {
        e.style.backgroundColor = 'rgba(255,0,0,0.8)'
        e.style.color           = '#fff'
      })
    })
    el.addEventListener('mouseleave', () => {
      viewer.value.querySelectorAll(`.group-${highlightId}`).forEach(e => {
        e.style.backgroundColor = 'rgba(255,200,200,0.8)'
        e.style.color           = '#c00'
      })
    })
    el.addEventListener('click', () => {
      window.open(targetUrl, '_blank')
    })
  })
}

// 初始加载时获取后端文件列表
onMounted(fetchFileList)
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
