import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { askAI, type Story } from '../lib/api'
import type { Message as MessageModel } from '../lib/types'
import { Message } from './Message'

type ChatEntry = MessageModel & { id: string }

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export type ChatBoxHandle = {
  sendQuestion: (question: string) => void
}

export type ChatBoxProps = {
  story: Story
  disabled?: boolean
  /** 仅锁定输入区（仍允许通过按钮/引导触发发送） */
  inputLocked?: boolean
  className?: string
  placeholder?: string
  /** 初始展示的消息（如欢迎语） */
  initialMessages?: Array<Pick<MessageModel, 'role' | 'content'>>
  onMessagesChange?: (messages: Array<Pick<MessageModel, 'role' | 'content'>>) => void
  onUserSend?: (question: string) => void
  onAiAnswer?: (payload: { label: string; answer: string; raw: string }) => void
  onError?: (message: string) => void
}

/**
 * 聊天区：上方消息列表（Message），下方输入与发送；回车发送、Shift+Enter 换行；新消息自动滚到底。
 */
export const ChatBox = forwardRef<ChatBoxHandle, ChatBoxProps>(function ChatBox(
  {
  story,
  disabled = false,
  inputLocked = false,
  className = 'min-h-[22rem]',
  placeholder = '输入你的问题…',
  initialMessages = [],
  onMessagesChange,
  onUserSend,
  onAiAnswer,
  onError,
  }: ChatBoxProps,
  ref,
) {
  const [messages, setMessages] = useState<ChatEntry[]>(() =>
    initialMessages.map((m) => ({
      ...m,
      id: createId(),
      createdAt: Date.now(),
    })),
  )
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [errorTip, setErrorTip] = useState<string | null>(null)
  const bottomRef = useRef<HTMLLIElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    onMessagesChange?.(messages.map(({ role, content }) => ({ role, content })))
  }, [messages, onMessagesChange])

  useEffect(() => {
    if (!errorTip) return
    const timer = window.setTimeout(() => setErrorTip(null), 2800)
    return () => window.clearTimeout(timer)
  }, [errorTip])

  const sendText = useCallback(
    async (rawText: string) => {
      const text = rawText.trim()
      if (text === '' || isThinking || disabled) return

      const thinkingId = createId()

      onUserSend?.(text)

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'user',
          content: text,
          createdAt: Date.now(),
        },
        {
          id: thinkingId,
          role: 'assistant',
          content: '思考中...',
          createdAt: Date.now(),
        },
      ])
      setInput('')
      setIsThinking(true)

      try {
        const answer = await askAI(text, story)
        const [maybeLabel, ...rest] = answer.split('：')
        const label = maybeLabel?.trim() ?? ''
        const shortAnswer = rest.join('：').trim()
        onAiAnswer?.({ label, answer: shortAnswer, raw: answer })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId ? { ...m, content: answer } : m,
          ),
        )
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '网络异常，请稍后重试。'
        onError?.(message)
        const friendly =
          message.includes('不符合规范') || message.includes('解析失败')
            ? '本次回答格式异常，请换个问法重新提问。'
            : `抱歉，暂时无法回答：${message}`
        setErrorTip(
          message.includes('不符合规范') || message.includes('解析失败')
            ? '回答格式异常，请尝试换个问法'
            : '连接异常，请稍后再试',
        )
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: friendly,
                }
              : m,
          ),
        )
      } finally {
        setIsThinking(false)
      }
    },
    [disabled, isThinking, onAiAnswer, onError, onUserSend, story],
  )

  const send = useCallback(() => {
    if (inputLocked) return
    void sendText(input)
  }, [input, inputLocked, sendText])

  useImperativeHandle(
    ref,
    () => ({
      sendQuestion: (q: string) => {
        void sendText(q)
      },
    }),
    [sendText],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    send()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 ring-1 ring-zinc-800/80 ${className}`}
    >
      {errorTip ? (
        <div className="mx-3 mt-3 rounded-lg border border-rose-500/35 bg-rose-900/30 px-3 py-2 text-xs text-rose-200 animate-in fade-in duration-200">
          {errorTip}
        </div>
      ) : null}
      <ul
        className="min-h-0 flex-1 list-none space-y-4 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4"
        aria-label="聊天记录"
      >
        {messages.length === 0 ? (
          <li className="list-none rounded-xl border border-dashed border-zinc-700/70 bg-zinc-900/40 p-5 text-center">
            <p className="text-sm font-medium text-zinc-300">还没有消息</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              试试从「人物、时间、动机、因果」切入提问，逐步缩小真相范围。
            </p>
          </li>
        ) : (
          messages.map((m) => (
            <li
              key={m.id}
              className="list-none animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              <Message message={{ role: m.role, content: m.content }} />
            </li>
          ))
        )}
        <li ref={bottomRef} aria-hidden className="h-px list-none" />
      </ul>

      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800/90 bg-zinc-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label htmlFor="chatbox-input" className="sr-only">
            聊天输入
          </label>
          <textarea
            id="chatbox-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={placeholder}
            disabled={disabled || isThinking || inputLocked}
            className="min-h-[2.75rem] w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400/50 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[5.5rem]"
            disabled={disabled || inputLocked || input.trim() === '' || isThinking}
          >
            {isThinking ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white" />
              </span>
            ) : (
              '发送'
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-600 sm:text-left">
          {disabled
            ? '本局已结束，输入区已关闭'
            : inputLocked
              ? '入门指引中：请使用上方固定推理按钮'
              : '回车发送 · Shift+Enter 换行'}
        </p>
      </form>
    </div>
  )
})
