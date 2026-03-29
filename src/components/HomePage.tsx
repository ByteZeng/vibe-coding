import { Link } from 'react-router-dom'
import { stories } from '../data/stories'
import { GameCard } from './GameCard'

/**
 * 游戏大厅：悬疑风背景 + 响应式故事网格
 */
export function HomePage() {
  const tutorialStory =
    stories.find((story) => story.id === 'story-tutorial-keys') ?? stories[0]
  const tutorialDone =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('tutorial.completed') === '1'

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* 氛围：暗角 + 紫雾 */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.22),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(91,33,182,0.12),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(0,0,0,0.65),transparent_55%)]"
        aria-hidden
      />
      {/* 微弱粒子流动 + 呼吸光效 */}
      <div
        className="pointer-events-none absolute -inset-24 opacity-25 [background-image:radial-gradient(rgba(196,181,253,0.8)_1px,transparent_1.2px)] [background-size:22px_22px] animate-[spin_90s_linear_infinite]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_60%_30%,rgba(167,139,250,0.14),transparent_40%)]"
        aria-hidden
      />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-violet-400/90">
            Mystery Lobby
          </p>
          <h1 className="mt-3 bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            AI海龟汤
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
            <br className="hidden sm:block" />
            <span className="text-violet-300/90">
              开启对话，穿越脑洞
            </span>
          </p>
          <div
            className="mx-auto mt-6 h-px max-w-xs bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"
            aria-hidden
          />
        </header>

        <section className="mt-12 sm:mt-14" aria-labelledby="lobby-stories-heading">
          <h2 id="lobby-stories-heading" className="sr-only">
            故事列表
          </h2>
          <ul className="mx-auto grid max-w-xl grid-cols-1 gap-5">
            <li className="min-w-0">
              <GameCard story={tutorialStory} variant="mystery" />
            </li>
          </ul>

          {tutorialDone ? (
            <div className="mt-6 text-center">
              <Link
                to="/stories"
                className="inline-flex items-center rounded-lg border border-violet-400/35 bg-violet-900/30 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-800/35"
              >
                入门已完成，进入故事选择 →
              </Link>
            </div>
          ) : (
            <p className="mt-6 text-center text-xs text-zinc-500">
              先完成入门指引，再解锁全部故事
            </p>
          )}
        </section>

        <footer className="mt-14 text-center font-mono text-[11px] text-zinc-600">
          真相只在一念之间 · 请勿在弱光环境下独自推理过久
        </footer>
      </main>
    </div>
  )
}
