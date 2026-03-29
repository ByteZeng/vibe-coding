import { Link } from 'react-router-dom'
import { stories } from '../data/stories'
import { GameCard } from './GameCard'

const TUTORIAL_ID = 'story-tutorial-keys'

export function StoriesPage() {
  const tutorialDone =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('tutorial.completed') === '1'

  const normalStories = stories
    .filter((story) => story.id !== TUTORIAL_ID)
    .slice()
    .sort((a, b) => {
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
      return a.title.localeCompare(b.title, 'zh-Hans-CN')
    })

  if (!tutorialDone) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-violet-400/80">
          Locked
        </p>
        <h1 className="mt-3 text-2xl font-semibold">请先完成入门指引</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">
          完成三步固定推理后，这里会解锁更多不同难度的海龟汤故事。
        </p>
        <Link
          to="/"
          className="mt-8 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          前往入门指引
        </Link>
      </main>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.22),transparent)]"
        aria-hidden
      />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="text-center">
          <div className="mb-4 flex justify-center">
            <Link
              to="/"
              className="rounded-full border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900/60"
            >
              ← 返回首页入门指引
            </Link>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-violet-400/90">
            Case Selection
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
            选择你的下一题
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            入门已完成，接下来挑战更多脑洞。
          </p>
        </header>

        <section className="mt-10">
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {normalStories.map((story) => (
              <li key={story.id} className="min-w-0">
                <GameCard story={story} variant="mystery" />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
