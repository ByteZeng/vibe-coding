type QuestionCardProps = {
  title: string
  prompt: string
}

export function QuestionCard({ title, prompt }: QuestionCardProps) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600">{prompt}</p>
    </section>
  )
}
