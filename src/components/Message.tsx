import type { Message as MessageModel } from '../lib/types'

export type MessageProps = {
  /** 单条消息：角色 + 正文（与 `lib/types` 对齐，可只传 role/content） */
  message: Pick<MessageModel, 'role' | 'content'>
  className?: string
}

function UserAvatar() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/25 ring-1 ring-violet-500/40"
      aria-hidden
    >
      <svg
        className="h-5 w-5 text-violet-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    </span>
  )
}

function AssistantAvatar() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 ring-1 ring-zinc-600/80"
      aria-hidden
    >
      <svg
        className="h-5 w-5 text-violet-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
      </svg>
    </span>
  )
}

/**
 * 单条聊天消息：用户靠右、AI 靠左，带头像与差异化气泡样式。
 */
export function Message({ message, className = '' }: MessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${className}`}
    >
      <div
        className={`flex max-w-[min(100%,28rem)] items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        role="group"
        aria-label={isUser ? '用户消息' : 'AI 消息'}
      >
        {isUser ? <UserAvatar /> : <AssistantAvatar />}
        <div
          className={`min-w-0 rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'rounded-br-md bg-violet-600/35 text-zinc-100 ring-1 ring-violet-500/35'
              : 'rounded-bl-md bg-zinc-800/90 text-zinc-200 ring-1 ring-zinc-700/80'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  )
}
