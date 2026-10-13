/**
 * 邮箱组件辅助：仅允许 USTC 相关邮箱登录/注册。
 * 结构上：用户名(本地部分)自由输入 + 固定域名选择（仅 mail.ustc.edu.cn / ustc.edu.cn）。
 * 且提供硬校验 assertAllowedEmail，供登录/注册/找回密码在调用 Supabase 前兜底拒绝
 * 其它域名邮箱，从根本上掐掉用非 USTC 邮箱登录的途径。
 */

/** 允许的邮箱域名（不含 @）。 */
export const EMAIL_DOMAINS = ['mail.ustc.edu.cn', 'ustc.edu.cn'] as const

export type EmailDomain = (typeof EMAIL_DOMAINS)[number]

/** 从完整邮箱值里取出「本地部分」（@ 之前），没有 @ 则整串都是本地部分。 */
export function localPart(value: string): string {
  const at = value.indexOf('@')
  return at === -1 ? value : value.slice(0, at)
}

/** 当前是否已经确定后缀（已包含 @ 即视为完成）。 */
export function isComplete(value: string): boolean {
  return value.includes('@')
}

/** 用「本地部分 + 选中域名」拼成完整邮箱。 */
export function buildEmail(local: string, domain: EmailDomain): string {
  return `${local.trim()}@${domain}`
}

/** 若 value 已选择允许的域名，返回该域名；否则返回 null。 */
export function selectedDomainOf(value: string): EmailDomain | null {
  const at = value.lastIndexOf('@')
  if (at <= 0) return null
  const domain = value.slice(at + 1).toLowerCase()
  return (EMAIL_DOMAINS as readonly string[]).includes(domain)
    ? (domain as EmailDomain)
    : null
}

/** 是否以允许的 USTC 域名结尾的完整邮箱。 */
export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at <= 0) return false
  const domain = email.slice(at + 1).toLowerCase()
  return (EMAIL_DOMAINS as readonly string[]).includes(domain)
}

/** 错误提示文本。 */
export function allowedDomainHint(): string {
  return `仅支持 ${EMAIL_DOMAINS.map((d) => '@' + d).join(' / ')} 邮箱`
}

/**
 * 硬校验：非允许域名直接抛错。所有发送给 Supabase 的邮箱都必须经过它。
 */
export function assertAllowedEmail(email: string): string {
  if (!isAllowedEmail(email)) {
    throw new Error(allowedDomainHint())
  }
  return email
}
