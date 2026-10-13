import { getApkDownloadUrl } from '@/lib/update'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 px-6 py-10">
      <div className="mx-auto max-w-6xl text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ustc-blue to-ustc-blue-dark text-sm font-bold text-white">
            科
          </div>
          <span className="text-lg font-bold text-ink-primary">科了</span>
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          中国科学技术大学校友社区 · column.ustc.edu.cn
        </p>
        <a
          href={getApkDownloadUrl()}
          className="inline-flex items-center gap-2 rounded-xl bg-surface-secondary px-5 py-2.5 text-sm font-medium text-ustc-blue transition-all hover:bg-ustc-blue-10"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          下载 Android 版
        </a>
        <p className="mt-6 text-xs text-ink-muted">
          非官方校友平台 · 为科大人而建
        </p>
      </div>
    </footer>
  )
}
