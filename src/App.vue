<template>
  <div class="container">
    <h1>DOCX Preview + 文本高亮（纯 JS） </h1>
    <label>
      1. 上传 Word:
      <input type="file" accept=".docx" @change="onFileUpload" />
    </label>
    <label>
      2. 输入要高亮的文本：
      <input v-model="targetText" placeholder="智能工厂" />
      <button @click="applyHighlight">高亮匹配</button>
    </label>
    <div ref="viewer" class="docx-viewer"></div>
  </div>
</template>

<script setup>
// @ts-nocheck
import { ref, nextTick } from 'vue'
import { renderAsync } from 'docx-preview'

const viewer    = ref(null)
const targetText = ref('智能工厂')
let rawHtml     = ''

function escapeRegExp(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function buildFlexibleRegex(str) {
  return new RegExp(
    str
      .trim()
      .split(/\s+/)
      .map(escapeRegExp)
      .join('\\s*'),
    'g'
  )
}

async function onFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file || !viewer.value) return
  const buf = await file.arrayBuffer()
  viewer.value.innerHTML = ''
  await renderAsync(buf, viewer.value)
  await nextTick()
  rawHtml = viewer.value.innerHTML
}

async function applyHighlight() {
  if (!viewer.value) return
  if (!rawHtml) {
    alert('请先上传并渲染文档')
    return
  }
  viewer.value.innerHTML = rawHtml
  await nextTick()

  const regex = buildFlexibleRegex(targetText.value)
  const walker = document.createTreeWalker(
    viewer.value,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return regex.test(node.nodeValue || '')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
      }
    }
  )
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)

  nodes.forEach(textNode => {
    const txt = textNode.nodeValue || ''
    let last = 0
    const frag = document.createDocumentFragment()
    txt.replace(regex, (match, offset) => {
      frag.appendChild(document.createTextNode(txt.slice(last, offset)))
      const span = document.createElement('span')
      span.className = 'highlight'
      span.textContent = match
      span.onclick = () => window.open('https://example.com/details', '_blank')
      frag.appendChild(span)
      last = offset + match.length
      return match
    })
    frag.appendChild(document.createTextNode(txt.slice(last)))
    textNode.parentNode.replaceChild(frag, textNode)
  })
}
</script>

<style>
.container { max-width: 800px; margin:2rem auto; font-family:sans-serif; }
.docx-viewer { border:1px solid #ddd; padding:1rem; max-height:70vh; overflow:auto; }
.docx-viewer table { width:100%; border-collapse:collapse; margin:1em 0; }
.docx-viewer th, .docx-viewer td { border:1px solid #ccc; padding:4px; }
.highlight {
  background: rgba(255,200,200,0.8);
  color: #c00;
  font-weight: bold;
  padding: 0 2px;
  cursor: pointer;
}
.highlight:hover {
  background: rgba(255,150,150,1);
}
</style>
