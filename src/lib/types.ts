export type JudgeLabel = '是的' | '不是' | '无关紧要' | '有一定关系' | '未提及'
export type GuessLabel = '基本正确' | '部分正确' | '明显错误'

export type Message = {
  role: 'user' | 'assistant'
  content: string
  label?: JudgeLabel
  createdAt: number
}
