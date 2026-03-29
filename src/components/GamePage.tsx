import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { stories } from '../data/stories'
import type { Message as ChatMessage } from '../lib/types'
import { ChatBox, type ChatBoxHandle } from './ChatBox'

const DIFFICULTY_TEXT: Record<number, string> = {
  1: '入门',
  2: '简单',
  3: '中等',
  4: '困难',
  5: '烧脑',
}

/**
 * 游戏页：按 URL :id 加载故事，展示汤面 + 聊天 + 汤底 / 结束操作。
 * 路由：/game/:id
 */
export function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [gameStatus, setGameStatus] = useState<'in_progress' | 'ended'>(
    'in_progress',
  )
  const [confirmRevealOpen, setConfirmRevealOpen] = useState(false)
  const [history, setHistory] = useState<
    Array<Pick<ChatMessage, 'role' | 'content'>>
  >([])
  const chatRef = useRef<ChatBoxHandle>(null)

  // 进度与成就感反馈（轻量实现）
  const [questionCount, setQuestionCount] = useState(0)
  const [effectiveStreak, setEffectiveStreak] = useState(0)
  const [, setEffectiveCount] = useState(0)
  const clueKeysRef = useRef<Set<string>>(new Set())
  const [clueCount, setClueCount] = useState(0)
  const [, setBadges] = useState<Set<string>>(() => new Set())
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (text: string) => {
    setToast(text)
  }

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const story = useMemo(
    () => (id != null ? stories.find((s) => s.id === id) : undefined),
    [id],
  )

  // 入门指引：三步固定推理
  const isTutorial = story?.id === 'story-tutorial-keys'
  const [tutorialStep, setTutorialStep] = useState(0) // 0~3
  const [tutorialSending, setTutorialSending] = useState(false)
  const pendingTutorialStep = useRef<number | null>(null)
  const [, setTutorialDoneChoiceOpen] = useState(false)

  if (story == null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-violet-400/80">
          404
        </p>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">
          未找到该故事
        </h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          链接可能已失效，或题目已被移除。请返回大厅重新选择。
        </p>
        <Link
          to="/"
          className="mt-8 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          返回大厅
        </Link>
      </main>
    )
  }

  const diffLabel = DIFFICULTY_TEXT[story.difficulty] ?? `Lv.${story.difficulty}`

  // （已按需求移除进度条，仅保留关键线索数量展示）

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* 氛围背景 */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(124,58,237,0.14),transparent)]"
        aria-hidden
      />

      <header className="relative z-10 shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link
            to="/"
            className="shrink-0 text-sm text-violet-300/90 transition hover:text-violet-200"
          >
            ← 大厅
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              {gameStatus === 'in_progress' ? '进行中' : '已结束'}
            </span>
            <span className="rounded-full bg-zinc-900/60 px-2 py-0.5 text-[10px] text-zinc-400 ring-1 ring-zinc-700/70">
              关键线索 {clueCount} / 3
            </span>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-3xl">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>关键线索 {clueCount} / 3</span>
            <span>提问 {questionCount}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 min-h-0 flex-col gap-4 px-3 py-3 sm:px-6 sm:py-6">
        {/* 标题 + 汤面 */}
        <section
          className="shrink-0 rounded-xl border border-zinc-800/90 bg-zinc-900/50 p-4 shadow-lg shadow-black/20 ring-1 ring-zinc-800/80 backdrop-blur-sm sm:p-5"
          aria-labelledby="game-story-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
            <h1
              id="game-story-title"
              className="text-lg font-semibold leading-snug text-zinc-50 sm:text-xl"
            >
              {story.title}
            </h1>
            <span className="rounded-full bg-violet-950/60 px-2.5 py-0.5 text-xs font-medium text-violet-200 ring-1 ring-violet-500/30">
              {diffLabel} · Lv.{story.difficulty}
            </span>
          </div>
          <h2 className="mt-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            汤面
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-300 sm:text-[15px]">
            {story.surface}
          </p>
        </section>

        {/* 聊天区 */}
        <section
          className="flex min-h-0 flex-1 flex-col"
          aria-label="与 AI 裁判对话"
        >
          {isTutorial ? (
            <section className="mb-3 rounded-xl border border-violet-500/20 bg-zinc-900/40 p-4 ring-1 ring-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-300/80">
                    Tutorial
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-zinc-100">
                    入门指引（固定推理 3 步）
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    先用三个固定推理熟悉问法：每步都是“可判断真假的问题”。完成后将解锁自由提问。
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-violet-950/60 px-2.5 py-0.5 text-[10px] text-violet-200 ring-1 ring-violet-500/30">
                  {tutorialStep}/3
                </span>
              </div>

              {tutorialStep >= 3 ? (
                <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3">
                  <p className="text-xs text-emerald-200">
                    入门指引完成。你可以继续自由输入提问，或进入故事选择。
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTutorialDoneChoiceOpen(false)
                        showToast('已解锁自由提问')
                      }}
                      className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
                    >
                      继续自由输入
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/stories')}
                      className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                    >
                      进入故事选择
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-zinc-500">
                    不想做指引？也可以直接跳过。
                  </p>
                  <button
                    type="button"
                    disabled={tutorialSending || gameStatus === 'ended'}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('tutorial.completed', '1')
                      }
                      setTutorialStep(3)
                      setTutorialSending(false)
                      pendingTutorialStep.current = null
                      showToast('已跳过指引：自由提问已解锁')
                      navigate('/stories')
                    }}
                    className="rounded-lg border border-violet-400/25 bg-violet-950/30 px-3 py-2 text-xs font-medium text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-900/35 disabled:opacity-50"
                  >
                    跳过指引 →
                  </button>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {
                    step: 1,
                    title: '推理 1：是否有人闯入？',
                    question: '这件事和“有人入室闯入”有关吗？',
                  },
                  {
                    step: 2,
                    title: '推理 2：钥匙是否在他身上？',
                    question: '当时钥匙一直在他身上吗？',
                  },
                  {
                    step: 3,
                    title: '推理 3：是否与宠物/设备有关？',
                    question: '这件事是否与宠物或智能设备有关？',
                  },
                ].map((item) => {
                  const locked = item.step > tutorialStep + 1
                  const done = item.step <= tutorialStep
                  return (
                    <button
                      key={item.step}
                      type="button"
                      disabled={
                        locked ||
                        tutorialSending ||
                        gameStatus === 'ended' ||
                        (pendingTutorialStep.current != null &&
                          pendingTutorialStep.current !== item.step)
                      }
                      onClick={() => {
                        pendingTutorialStep.current = item.step
                        setTutorialSending(true)
                        chatRef.current?.sendQuestion(item.question)
                      }}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                        done
                          ? 'border-emerald-500/25 bg-emerald-950/25 text-emerald-100'
                          : locked
                            ? 'border-zinc-700 bg-zinc-900/30 text-zinc-500'
                            : 'border-violet-500/25 bg-zinc-950/30 text-zinc-200 hover:border-violet-400/40 hover:bg-zinc-900/40 active:scale-[0.99]'
                      }`}
                    >
                      <div className="font-medium">{item.title}</div>
                      <div className="mt-1 text-[11px] text-zinc-400">
                        {done ? '已完成' : locked ? '未解锁' : '点击发送'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          <ChatBox
            ref={chatRef}
            story={story}
            disabled={gameStatus === 'ended'}
            inputLocked={isTutorial && tutorialStep < 3}
            onMessagesChange={setHistory}
            onUserSend={() => {
              setQuestionCount((v) => v + 1)
              setBadges((prev) => {
                if (prev.has('first')) return prev
                const next = new Set(prev)
                next.add('first')
                showToast('徽章解锁：好奇宝宝')
                return next
              })
            }}
            onAiAnswer={({ label, answer }) => {
              // 入门指引：按步骤推进
              if (isTutorial && pendingTutorialStep.current != null) {
                const nextStep = pendingTutorialStep.current
                pendingTutorialStep.current = null
                setTutorialSending(false)
                setTutorialStep((prev) => {
                  const updated = Math.max(prev, nextStep)
                  if (updated >= 3 && prev < 3) {
                    showToast('入门指引完成：已解锁自由提问')
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('tutorial.completed', '1')
                    }
                    setTutorialDoneChoiceOpen(true)
                  }
                  return updated
                })
              }

              const effective = label !== '无关' && label !== ''
              setEffectiveCount((v) => (effective ? v + 1 : v))
              setEffectiveStreak((v) => (effective ? v + 1 : 0))

              // 关键线索：当标签为 是 / 有一定关系 时，且回答内容出现新信息（去重后）计为一次
              if (label === '是' || label === '有一定关系') {
                const key = `${label}|${answer}`.trim()
                if (key && !clueKeysRef.current.has(key)) {
                  clueKeysRef.current.add(key)
                  setClueCount((v) => {
                    const next = v + 1
                    if (next === 3) {
                      setBadges((prev) => {
                        if (prev.has('witness')) return prev
                        const n = new Set(prev)
                        n.add('witness')
                        showToast('徽章解锁：关键证人')
                        return n
                      })
                    }
                    return next
                  })
                }
              }

              // 连续 5 次有效提问
              setBadges((prev) => {
                if (prev.has('detective')) return prev
                // 这里用“即将更新的 streak”判断：如果本次有效且当前 streak==4 -> 达成 5
                if (effective && effectiveStreak >= 4) {
                  const next = new Set(prev)
                  next.add('detective')
                  showToast('徽章解锁：逻辑侦探')
                  return next
                }
                return prev
              })
            }}
            onError={() => {
              if (isTutorial && pendingTutorialStep.current != null) {
                pendingTutorialStep.current = null
                setTutorialSending(false)
              }
            }}
            className="flex min-h-0 flex-1 flex-col border-zinc-800/90 bg-zinc-950/60"
            placeholder="向 AI 裁判提问…"
            initialMessages={[
              {
                role: 'assistant',
                content:
                  isTutorial
                    ? '这是入门指引题。请先用上方三个固定推理按钮发送问题，我会按「是/否/无关/有一定关系」回复。完成三步后再自由提问。'
                    : '我是 AI 裁判。请用可判断真假的提问推进推理；我会用「是/否/无关/有一定关系」回复，不直接揭晓汤底。',
              },
            ]}
          />
        </section>

        {/* 底部操作 */}
        <footer className="flex shrink-0 flex-col gap-3 border-t border-zinc-800/60 pt-2 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
          <p className="order-2 text-center text-[11px] text-zinc-600 sm:order-1 sm:text-left">
            汤底含完整真相，建议推理后再看
          </p>
          <div className="order-1 grid grid-cols-1 gap-2 sm:order-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmRevealOpen(true)}
              className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-4 py-2.5 text-sm font-medium text-violet-100 transition active:scale-[0.99] hover:border-violet-400/50 hover:bg-violet-900/50 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              查看汤底
            </button>
            <button
              type="button"
              onClick={() => {
                setGameStatus('ended')
                const abandon = window.confirm(
                  '确认结束本局并返回大厅吗？你可以中途放弃游戏。',
                )
                if (abandon) {
                  navigate('/')
                  return
                }
                setGameStatus('in_progress')
              }}
              className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition active:scale-[0.99] hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            >
              结束游戏
            </button>
          </div>
        </footer>
      </main>

      {confirmRevealOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => setConfirmRevealOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reveal-confirm-title"
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="reveal-confirm-title"
              className="text-base font-semibold text-zinc-100"
            >
              确认查看汤底？
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              查看后将直接进入结果页，推理乐趣会明显下降。建议确认已无更多问题再揭晓。
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setConfirmRevealOpen(false)}
                className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                先不看
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmRevealOpen(false)
                  setGameStatus('ended')
                  navigate(`/result/${story.id}`, {
                    state: { history },
                  })
                }}
                className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                确认查看
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[60] -translate-x-1/2">
          <div className="rounded-full border border-violet-400/30 bg-zinc-900/85 px-4 py-2 text-xs font-medium text-zinc-100 shadow-lg shadow-black/30 ring-1 ring-white/5 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  )
}
