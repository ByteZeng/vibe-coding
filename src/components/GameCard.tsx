import { Link } from 'react-router-dom'
import type { StoryDifficulty, TurtleSoupStory } from '../data/stories'

export type GameCardProps = {
  story: TurtleSoupStory
  /** 大厅深色悬疑风；默认浅色卡片 */
  variant?: 'default' | 'mystery'
}

const DIFFICULTY_META: Record<
  StoryDifficulty,
  { label: string; className: string; mysteryClassName: string }
> = {
  1: {
    label: '入门',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
    mysteryClassName:
      'bg-emerald-950/50 text-emerald-200 ring-emerald-500/30',
  },
  2: {
    label: '简单',
    className: 'bg-sky-50 text-sky-800 ring-sky-200/80',
    mysteryClassName: 'bg-sky-950/50 text-sky-200 ring-sky-500/30',
  },
  3: {
    label: '中等',
    className: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    mysteryClassName:
      'bg-amber-950/50 text-amber-200 ring-amber-500/35',
  },
  4: {
    label: '困难',
    className: 'bg-orange-50 text-orange-900 ring-orange-200/80',
    mysteryClassName:
      'bg-orange-950/50 text-orange-200 ring-orange-500/35',
  },
  5: {
    label: '烧脑',
    className: 'bg-rose-50 text-rose-900 ring-rose-200/80',
    mysteryClassName: 'bg-rose-950/50 text-rose-200 ring-rose-500/35',
  },
}

/**
 * 单个海龟汤游戏卡片：展示标题与难度，点击进入游戏页。
 * 风格：简洁、偏 slate 中性色，符合 MVP 前端约束（Tailwind、无复杂状态库）。
 */
export function GameCard({ story, variant = 'default' }: GameCardProps) {
  const meta = DIFFICULTY_META[story.difficulty]
  const isMystery = variant === 'mystery'

  const cardClass = isMystery
    ? 'rounded-xl border border-violet-500/20 bg-zinc-900/50 p-5 shadow-lg shadow-black/40 outline-none ring-1 ring-inset ring-white/5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-violet-400/35 hover:shadow-violet-950/50 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-violet-400/40'
    : 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm outline-none ring-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-900/20'

  const titleClass = isMystery
    ? 'text-left text-base font-semibold text-zinc-100 transition group-hover:text-violet-200'
    : 'text-left text-base font-semibold text-slate-900 transition group-hover:text-slate-950'

  const badgeClass = isMystery ? meta.mysteryClassName : meta.className

  const surfaceClass = isMystery
    ? 'mt-3 line-clamp-2 text-left text-sm leading-relaxed text-zinc-400'
    : 'mt-3 line-clamp-2 text-left text-sm leading-relaxed text-slate-600'

  const ctaClass = isMystery
    ? 'mt-4 text-left text-xs font-medium text-violet-300/80 transition group-hover:text-violet-200'
    : 'mt-4 text-left text-xs font-medium text-slate-500 transition group-hover:text-slate-700'

  return (
    <Link to={`/game/${story.id}`} className={`group block ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={titleClass}>{story.title}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}
          title={`难度 ${story.difficulty}/5`}
        >
          {meta.label} · Lv.{story.difficulty}
        </span>
      </div>
      <p className={surfaceClass}>{story.surface}</p>
      <p className={ctaClass}>点击进入游戏 →</p>
    </Link>
  )
}
