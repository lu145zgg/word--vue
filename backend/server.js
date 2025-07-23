import express from 'express'
import multer  from 'multer'
import cors    from 'cors'
import path    from 'path'
import fs      from 'fs'

const app = express()

// 允许前端跨域（根据你的前端地址调整 origin）
app.use(cors({
  origin: 'http://localhost:5173'
}))

// 上传文件存放目录（若不存在则创建）
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Multer 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:  (req, file, cb) => {
    const name = Date.now() + '-' + file.originalname
    cb(null, name)
  }
})
const upload = multer({ storage })

// —— 接口定义 —— //

// 1) 上传接口：接收 field 名为 `file` 的单文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  // 返回前端可访问的 URL
  res.json({ url: `/uploads/${req.file.filename}` })
})

// 2) 列出所有已上传文件
app.get('/api/files', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Read uploads directory failed' })
    }
    // 返回 [{ filename, url }]
    const list = files.map(name => ({
      filename: name,
      url:      `/uploads/${name}`
    }))
    res.json({ files: list })
  })
})

// 3) 静态托管 uploads 目录
app.use('/uploads', express.static(UPLOAD_DIR))

// 启动服务器
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`)
})
