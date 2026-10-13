/**
 * 全局字号：通过 html 根字号（font-size 百分比）等比缩放全站 rem 字号，
 * 「标题 > 正文 > 辅助文字」的相对层级保持不变。
 * 偏好保存在 localStorage（按设备生效，App 与浏览器各自独立）。
 */
const STORAGE_KEY = 'keliao.fontScale'

export interface FontScaleOption {
  label: string
  value: number
}

/** 预设档位（相对 100% 的缩放倍数）。 */
export const FONT_SCALE_OPTIONS: FontScaleOption[] = [
  { label: '小', value: 0.9 },
  { label: '标准', value: 1 },
  { label: '大', value: 1.125 },
]

export function getFontScale(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 1
    const v = parseFloat(raw)
    return FONT_SCALE_OPTIONS.some((o) => o.value === v) ? v : 1
  } catch {
    return 1
  }
}

/** 设置并立即应用，同时持久化。 */
export function setFontScale(value: number): void {
  applyFontScale(value)
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // 存储不可用时仅本次会话生效
  }
}

/** 立即应用（value 缺省用已保存值）。App 启动时应先调用一次，避免首帧以默认字号闪现。 */
export function applyFontScale(value: number = getFontScale()): void {
  document.documentElement.style.fontSize = `${value * 100}%`
}
