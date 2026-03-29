import type { TurtleSoupStory } from '../data/stories'

export type Story = TurtleSoupStory

type JudgeResponse = {
  label: '是' | '否' | '无关' | '有一定关系'
  answer: string
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  throw new Error('AI 返回内容不是有效 JSON')
}

function parseJudgeResponse(raw: string): JudgeResponse {
  const jsonText = extractJson(raw)
  const parsed = JSON.parse(jsonText) as Partial<{
    label: string
    answer: string
  }>
  if (typeof parsed.answer !== 'string' || typeof parsed.label !== 'string') {
    throw new Error('AI JSON 字段不完整')
  }

  const normalized = normalizeLabel(parsed.label)
  if (!normalized) {
    throw new Error('AI 回复标签不符合规范，请重新提问')
  }

  return {
    label: normalized,
    answer: parsed.answer.trim(),
  }
}

function normalizeLabel(label: string): JudgeResponse['label'] | null {
  const raw = label.trim()
  if (raw === '是' || raw === '是的') return '是'
  if (raw === '否' || raw === '不是') return '否'
  if (raw === '无关' || raw === '无关紧要' || raw === '未提及') return '无关'
  if (raw === '有一定关系' || raw === '有关系') return '有一定关系'
  return null
}

/**
 * 通过后端代理调用 AI 裁判接口（POST /api/chat），返回一句不剧透回答。
 * 前端不再读取/持有任何 API Key。
 */
export async function askAI(question: string, story: Story): Promise<string> {
  if (!question.trim()) {
    throw new Error('问题不能为空')
  }

  let response: Response
  try {
    // 走同源 /api，由 Vite 代理到后端，避免开发环境跨域
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        story,
      }),
    })
  } catch {
    throw new Error('网络异常：无法连接到后端服务，请确认后端已启动且代理配置正确。')
  }

  if (!response.ok) {
    let message = `AI 接口请求失败(${response.status})`
    try {
      const data = (await response.json()) as { error?: { message?: string } }
      if (data?.error?.message) message = data.error.message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const data = (await response.json()) as { answer?: string }
  const content = data.answer
  if (!content) {
    throw new Error('AI 响应为空')
  }

  try {
    const parsed = parseJudgeResponse(content)
    if (!parsed.answer) {
      throw new Error('AI 回复内容为空，请重新提问')
    }
    return `${parsed.label}：${parsed.answer}`
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知解析错误'
    throw new Error(`AI 返回解析失败：${message}`)
  }
}
