import { useEffect, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { isNativeApp } from '@/lib/update'

/**
 * Android 返回键处理：
 * - 非根页面（canGoBack）→ 正常回退上一页
 * - 根页面（无法回退）→ 第一次按提示「再按一次退出应用」，2 秒内再按则退出
 * 仅在原生 App（Capacitor）内生效；浏览器中不注册。
 */
export default function BackButtonHandler() {
  const [toast, setToast] = useState(false)
  const lastBackRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isNativeApp()) return

    let handle: PluginListenerHandle | null = null

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        // 还有历史可退 → 正常回退
        window.history.back()
        return
      }

      // 已在根页面：双击退出
      const now = Date.now()
      if (now - lastBackRef.current < 2000) {
        App.exitApp()
        return
      }
      lastBackRef.current = now
      setToast(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setToast(false), 2500)
    }).then((h) => {
      handle = h
    })

    return () => {
      handle?.remove()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-[300] flex justify-center px-6">
      <div className="rounded-full bg-black/75 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
        再按一次退出应用
      </div>
    </div>
  )
}
