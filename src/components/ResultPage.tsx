import { Link, useLocation, useParams } from 'react-router-dom'
import { stories } from '../data/stories'
import type { Message as ChatMessage } from '../lib/types'

type ResultLocationState = {
  history?: Array<Pick<ChatMessage, 'role' | 'content'>>
}

export function ResultPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const state = location.state as ResultLocationState | null
  const history = state?.history ?? []
  const story = id ? stories.find((item) => item.id === id) : undefined

  if (!story) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-100">
        <h1 className="text-xl font-semibold">结果页未找到故事</h1>
        <Link
          to="/"
          className="mt-6 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          返回大厅
        </Link>
      </main>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(168,85,247,0.25),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_35%,rgba(192,132,252,0.10),transparent_45%)]"
        aria-hidden
      />

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <header className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-violet-300/90">
            Final Reveal
          </p>
          <h1 className="mt-3 text-3xl font-bold text-zinc-50 sm:text-4xl">
            {story.title}
          </h1>
        </header>

        <section className="mt-8 rounded-2xl border border-violet-400/30 bg-zinc-900/75 p-6 shadow-2xl shadow-violet-950/40 ring-1 ring-violet-300/20 backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-violet-300">
            汤底揭晓
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-zinc-200 sm:text-lg">
            {story.bottom}
          </p>
        </section>

        {history.length > 0 ? (
          <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              对话回顾（可选）
            </h3>
            <ul className="mt-4 space-y-3">
              {history.map((msg, index) => (
                <li
                  key={`${msg.role}-${index}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm"
                >
                  <span className="mr-2 font-medium text-violet-300">
                    {msg.role === 'user' ? '你' : 'AI'}
                  </span>
                  <span className="text-zinc-300">{msg.content}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-10 flex justify-center">
          <Link
            to={story.id === 'story-tutorial-keys' ? '/stories' : '/'}
            className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            {story.id === 'story-tutorial-keys' ? '进入故事选择' : '再来一局'}
          </Link>
        </div>
      </main>
    </div>
  )
}
