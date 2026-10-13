import { supabase } from './supabase'
import { assertAllowedEmail } from './email'

/**
 * 认证层：统一封装登录/注册/退出/找回密码/改密码。
 * 所有与 Supabase Auth 相关的调用都应经由这里，邮件硬校验也在此集中处理，
 * 组件层无需再直接 import supabase.auth 或 assertAllowedEmail。
 */

export type SignUpData = {
  nickname?: string | null
  real_name?: string | null
  gender?: string | null
  graduation_year?: string | null
  graduation_time?: string | null
  degree?: string | null
  alumni_mode?: string
}

/** 注册：邮箱硬校验 + 携带身份资料元数据。 */
export async function signUp(
  email: string,
  password: string,
  data: SignUpData
): Promise<void> {
  const allowed = assertAllowedEmail(email)
  const { error } = await supabase.auth.signUp({
    email: allowed,
    password,
    options: { data },
  })
  if (error) throw error
}

/** 登录：邮箱硬校验。 */
export async function signIn(email: string, password: string): Promise<void> {
  const allowed = assertAllowedEmail(email)
  const { error } = await supabase.auth.signInWithPassword({
    email: allowed,
    password,
  })
  if (error) throw error
}

/** 退出登录。 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/**
 * 忘记密码：向邮箱发送重置邮件。
 * redirectTo 指向本站的 /reset-password 页面，避免跳转到 Supabase 默认确认页
 * （默认页会在点击链接时直接把会话当成「已登录」，导致无法在本站设置新密码）。
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const allowed = assertAllowedEmail(email)
  const { error } = await supabase.auth.resetPasswordForEmail(allowed, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

/** 用已存在的 recovery 会话来设置新密码。 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/**
 * 登录状态下修改密码：先校验旧密码，再设置新密码。
 * Supabase 的 updateUser({ password }) 本身不校验旧密码，因此这里先用
 * 「旧密码 + 当前邮箱」重新登录来验证旧密码是否正确；验证通过后再更新为新密码。
 */
export async function changePasswordWithOldPassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('请先登录')

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  })
  if (signInError) throw new Error('当前密码不正确')

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) throw updateError
}
