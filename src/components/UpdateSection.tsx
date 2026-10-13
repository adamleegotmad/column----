import { useEffect, useState } from 'react'
import {
  checkForUpdate,
  getLocalVersion,
  isNativeApp,
  openDownload,
  type LocalVersion,
  type UpdateCheckResult,
} from '@/lib/update'

/**
 * 「App 更新」区块，放在个人设置里：
 * 显示当前版本 + 手动检查更新；发现新版时展示说明并跳转系统浏览器下载。
 * 仅在原生壳内渲染（浏览器中直接不显示）。
 */
export default function UpdateSection() {
  const [local, setLocal] = useState<LocalVersion | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    getLocalVersion()
      .then((v) => {
        if (!cancelled) setLocal(v)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!isNativeApp()) return null

  const runCheck = async () => {
    if (checking) return
    setChecking(true)
    setError(null)
    setResult(null)
    try {
      setResult(await checkForUpdate())
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查失败，请稍后重试')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="rounded-md border border-border-light bg-surface-secondary p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-ink-primary">App 更新</div>
        {local && (
          <span className="text-xs text-ink-muted">
            当前版本 {local.versionName}（build {local.versionCode}）
          </span>
        )}
      </div>

      {result?.status === 'latest' && (
        <p className="mt-2 text-xs text-emerald-600">已是最新版本 ✓</p>
      )}

      {result?.status === 'update' && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs font-semibold text-ustc-blue">
            发现新版本 {result.latest.versionName}
          </p>
          {result.latest.notes && (
            <p className="text-xs text-ink-muted">{result.latest.notes}</p>
          )}
          <button
            onClick={() => openDownload(result.latest.apkUrl).catch((err) => setError(err instanceof Error ? err.message : '打开下载失败'))}
            className="rounded-md bg-ustc-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark"
          >
            立即下载
          </button>
          <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
            将跳转到浏览器下载 APK；安装时请在浏览器提示中允许「安装未知应用」。
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <button
        onClick={runCheck}
        disabled={checking}
        className="mt-3 w-full rounded-md border-[1.5px] border-ustc-blue py-2.5 text-sm font-semibold text-ustc-blue transition-colors hover:bg-ustc-blue-10 disabled:opacity-50"
      >
        {checking ? '检查中…' : '检查更新'}
      </button>
    </div>
  )
}
