const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174']
function corsOrigins() {
  const raw = process.env.CORS_ORIGINS
  if (!raw || !String(raw).trim()) return DEFAULT_CORS_ORIGINS
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// 记录“当前运行的故事”（以最近一次 /api/chat 请求为准）
let activeStory = null
const ALLOWED_LABELS = ['是', '否', '无关', '有一定关系']
const DEFAULT_FALLBACK = {
  label: '无关',
  answer: '信息不足，请换个问法重新提问。',
}

function extractJson(text) {
  const trimmed = String(text || '').trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return null
}

function normalizeLabel(label) {
  const raw = String(label || '').trim()
  if (raw === '是' || raw === '是的') return '是'
  if (raw === '否' || raw === '不是') return '否'
  if (raw === '无关' || raw === '无关紧要' || raw === '未提及') return '无关'
  if (raw === '有一定关系' || raw === '有关系') return '有一定关系'
  return null
}

function normalizeAiResponse(raw) {
  const jsonText = extractJson(raw)
  if (!jsonText) return null
  try {
    const parsed = JSON.parse(jsonText)
    const label = normalizeLabel(parsed?.label)
    const answer = String(parsed?.answer || '').trim()
    if (!label || !ALLOWED_LABELS.includes(label) || !answer) return null
    // 约束 answer 长度（超出时裁剪，避免模型偶发超长）
    const shortAnswer = answer.slice(0, 20)
    return { label, answer: shortAnswer }
  } catch {
    return null
  }
}

// 允许前端地址访问；局域网调试时在 .env 中设置 CORS_ORIGINS（逗号分隔）。
app.use(
  cors({
    origin: corsOrigins(),
    credentials: true,
  }),
)
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'Backend server is running.' })
})

app.get('/api/test', (_req, res) => {
  res.json({
    success: true,
    message: 'API test passed.',
    timestamp: new Date().toISOString(),
  })
})

app.post('/api/chat', async (req, res) => {
  try {
    const { question, story } = req.body || {}

    if (typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'question 必须是非空字符串' },
      })
    }
    if (
      !story ||
      typeof story !== 'object' ||
      typeof story.title !== 'string' ||
      typeof story.surface !== 'string' ||
      typeof story.bottom !== 'string'
    ) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'story 必须包含 title/surface/bottom 字段',
        },
      })
    }

    // 打印当前在运行的故事（不打印汤底，避免剧透）
    const nextActive = {
      title: String(story.title),
      id: story.id != null ? String(story.id) : undefined,
    }
    const changed =
      !activeStory ||
      activeStory.title !== nextActive.title ||
      activeStory.id !== nextActive.id
    if (changed) {
      activeStory = nextActive
      console.log(
        `[game] active story: ${activeStory.id ? `${activeStory.id} - ` : ''}${activeStory.title}`,
      )
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return res.status(500).json({
        error: { code: 'MISSING_API_KEY', message: '未配置 DEEPSEEK_API_KEY' },
      })
    }

    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

    const systemPrompt = [
      '你是“海龟汤游戏裁判”。',
      '你必须严格按要求输出，禁止输出任何解释、前后缀、Markdown。',
      '',
      '【唯一输出格式】（严格 JSON）',
      '{"label":"是|否|无关|有一定关系","answer":"一句不超过20字的解释"}',
      '',
      '【强约束】',
      '1. 不允许剧透关键剧情或结局',
      '2. 不允许直接复述故事',
      '3. label 只能是：是、否、无关、有一定关系（四选一）',
      '4. answer 必须 <= 20 字，简短、模糊但有帮助',
      '5. 如果问题信息不足，优先给出 "无关" 或 "有一定关系"',
      '6. 绝不输出额外字段',
      '',
      '【示例 1】',
      '问：他是故意这么做的吗？',
      '答：{"label":"是","answer":"存在明确主观意图"}',
      '【示例 2】',
      '问：和天气有关吗？',
      '答：{"label":"无关","answer":"核心不在环境因素"}',
      '【示例 3】',
      '问：与死者身份有关吗？',
      '答：{"label":"有一定关系","answer":"相关但非决定因素"}',
      '【示例 4】',
      '问：他完全没有参与吗？',
      '答：{"label":"否","answer":"他与事件直接相关"}',
    ].join('\n')

    const userPrompt = [
      `题目：${story.title}`,
      `题面：${story.surface}`,
      `完整故事（仅裁判可见）：${story.bottom}`,
      `玩家问题：${question.trim()}`,
      '历史问答：[]',
    ].join('\n')

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(502).json({
        error: {
          code: 'UPSTREAM_ERROR',
          message: `DeepSeek 请求失败(${upstream.status})`,
          detail: text,
        },
      })
    }

    const data = await upstream.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || content.trim() === '') {
      return res.status(502).json({
        error: { code: 'UPSTREAM_EMPTY', message: 'DeepSeek 返回为空' },
      })
    }

    const normalized = normalizeAiResponse(content)
    if (!normalized) {
      return res.json({
        answer: JSON.stringify(DEFAULT_FALLBACK),
        fallback: true,
        notice: 'AI 回答格式不规范，已返回默认回答。请引导用户重新提问。',
      })
    }

    return res.json({ answer: JSON.stringify(normalized) })
  } catch (e) {
    const message = e instanceof Error ? e.message : '未知错误'
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message },
    })
  }
})

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`)
})
