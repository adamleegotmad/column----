const stats = [
  { num: '12,860', label: '认证校友' },
  { num: '38', label: '城市分会' },
  { num: '156', label: '本月活动' },
]

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F0F5FB] via-[#E3ECF7] to-[#D6E3F3] px-6 pb-[72px] pt-16 text-center">
      <div className="pointer-events-none absolute -top-[120px] -right-[120px] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,85,164,0.06)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-[80px] -left-[80px] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(0,85,164,0.04)_0%,transparent_70%)]" />

      <div className="relative z-1 mx-auto max-w-[720px]">
        <h1 className="mb-3 text-[44px] font-extrabold tracking-wide text-ink-primary">
          今天<span className="text-ustc-blue">科了</span>没？
        </h1>
        <p className="mb-8 text-[17px] leading-relaxed text-ink-secondary">
          无论你在哪里，科大永远是你的坐标原点。
        </p>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 rounded-md bg-ustc-blue px-7 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-ustc-blue-dark"
        >
          加入校友社区
        </a>

        <div className="mt-10 flex justify-center gap-12">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[28px] font-bold text-ustc-blue">{s.num}</div>
              <div className="mt-0.5 text-[13px] text-ink-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}