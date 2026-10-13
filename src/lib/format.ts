/** 相对时间：刚刚 / X分钟前 / X小时前 / 昨天 / 前天 / X月X日（跨年带年份） */
export function timeAgo(iso: string): string {
  const then = new Date(iso)
  const now = new Date()
  const diff = Math.max(0, now.getTime() - then.getTime())

  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`

  const hr = Math.floor(min / 60)

  // 按「自然日」判断今天/昨天/前天（而不是小时数累计），避免跨午夜误判
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const thenDayStart = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()
  const dayDiff = Math.round((startOfToday - thenDayStart) / 86400000)

  if (dayDiff === 0) return `${hr}小时前`
  if (dayDiff === 1) return '昨天'
  if (dayDiff === 2) return '前天'

  const sameYear = then.getFullYear() === now.getFullYear()
  if (sameYear) return `${then.getMonth() + 1}月${then.getDate()}日`
  return `${then.getFullYear()}年${then.getMonth() + 1}月${then.getDate()}日`
}

/**
 * 大数字缩写：超过 9999 时以「万」为单位取有效数字（去尾零）。
 * 12860 -> 1.3万，23000 -> 2.3万，10000 -> 1万，99999 -> 10万
 */
export function compact(n: number): string {
  if (n >= 10000) {
    const w = n / 10000
    // 取 1 位小数并去掉多余的 .0（如 2.0 -> 2）
    const val = Number.isInteger(w) ? String(w) : w.toFixed(1)
    return `${val}万`
  }
  return String(n)
}

/** 入学/毕业年份候选（近 40 年，倒序）。 */
export function yearOptions(span = 40): number[] {
  const current = new Date().getFullYear()
  const list: number[] = []
  for (let y = current; y >= current - span; y--) list.push(y)
  return list
}