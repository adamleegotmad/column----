import { useEffect, useRef, useState, type ReactNode } from 'react'

interface PullToRefreshProps {
  /** 下拉超过阈值松开后触发；返回 Promise 时，spinner 会持续到其完成 */
  onRefresh: () => Promise<unknown> | void
  children: ReactNode
  /** 触发刷新的下拉距离（px），默认 60 */
  threshold?: number
  /** 最大下拉距离（px），默认 110 */
  maxPull?: number
}

type PtrState = 'idle' | 'loading'

/**
 * 下拉刷新（触摸设备：手机 / 平板 / 模拟器）。
 * 页面滚动到顶部后继续下拉，超过阈值松开即触发 onRefresh；
 * 内容整体下移，上方空隙显示指示器（下拉刷新 → 松开刷新 → 转圈）。
 * 纯桌面环境（无触摸）自动不启用，不影响鼠标滚动。
 */
export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 60,
  maxPull = 110,
}: PullToRefreshProps) {
  const [state, setState] = useState<PtrState>('idle')
  const [offset, setOffsetState] = useState(0)

  const outerRef = useRef<HTMLDivElement | null>(null)
  const offsetRef = useRef(0)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const loadingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    // 纯桌面环境没有触摸，不启用
    if (!('ontouchstart' in window) && navigator.maxTouchPoints < 1) return

    const setOffset = (o: number) => {
      offsetRef.current = o
      setOffsetState(o)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (loadingRef.current) return
      // 仅当页面已在最顶部时才开始记录手势
      pullingRef.current = window.scrollY <= 0
      if (pullingRef.current) startYRef.current = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || loadingRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      if (window.scrollY > 0) {
        // 用户转为正常向上滚动，退出下拉模式
        pullingRef.current = false
        setOffset(0)
        return
      }
      if (dy <= 0) {
        setOffset(0)
        return
      }
      // 接管手势：阻止浏览器默认回弹
      e.preventDefault()
      // 超过阈值后加阻尼，避免无限拉长
      const resisted = dy <= threshold ? dy : threshold + (dy - threshold) * 0.35
      setOffset(Math.min(resisted, maxPull))
    }

    const onTouchEnd = () => {
      if (!pullingRef.current) return
      pullingRef.current = false
      if (offsetRef.current >= threshold) {
        loadingRef.current = true
        setState('loading')
        setOffset(56) // 收拢到指示器高度，等待刷新完成
        Promise.resolve(onRefreshRef.current())
          .catch(() => {
            // 刷新失败：保留现有内容，指示器照常收回
          })
          .finally(() => {
            loadingRef.current = false
            setState('idle')
            setOffset(0)
          })
      } else {
        setOffset(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [threshold, maxPull])

  return (
    <div ref={outerRef} className="relative">
      {/* 内容整体随下拉下移；空闲时回弹有过渡 */}
      <div
        className={state === 'idle' ? 'transition-transform duration-200' : undefined}
        style={{ transform: `translateY(${offset}px)` }}
      >
        {children}
      </div>

      {/* 指示器：出现在内容上方腾出的空隙里 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
        style={{ height: offset }}
      >
        <div
          className="flex items-center justify-center gap-2 text-xs text-ink-muted"
          style={{ height: offset }}
        >
          {state === 'loading' ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ustc-blue border-t-transparent" />
              刷新中…
            </>
          ) : offset >= threshold ? (
            '松开刷新'
          ) : (
            '下拉刷新'
          )}
        </div>
      </div>
    </div>
  )
}
