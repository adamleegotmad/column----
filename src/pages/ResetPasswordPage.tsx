import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { updatePassword } from '@/lib/auth'
import PasswordInput from '@/components/PasswordInput'

/**
 * 找回密码页。
 * 用户从邮箱链接跳转过来后，Supabase 已通过 URL 中的 recovery token 建立临时会话，
 * 并触发 onAuthStateChange -> 'PASSWORD_RECOVERY'。本页检测到该事件后展示
 * 「设置新密码」表单；提交后调用 updateUser({ password }) 更新密码，并退出登录，
 * 让用户用新密码重新登录。
 */
export default function ResetPasswordPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [detecting, setDetecting] = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
        setSession(s)
        if (!cancelled) setDetecting(false)
      }
    })

    // 初次进入：检查 URL 中的 recovery token 是否已解析成临时会话
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) {
        setIsRecovery(true)
      }
      setDetecting(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await updatePassword(password)
      // 更新成功后退出登录，避免停留在临时 recovery 会话
      await supabase.auth.signOut()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-6">
        <div className="w-full max-w-sm rounded-2xl border border-border-light bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink-primary">密码已重置 ✓</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            你的密码已更新成功，请使用新密码重新登录。
          </p>
          <Link
            to="/"
            className="mt-4 block rounded-md bg-ustc-blue py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark"
          >
            返回登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border-light bg-surface p-6 shadow-sm">
        {detecting && !isRecovery ? (
          <>
            <h2 className="text-lg font-bold text-ink-primary">设置新密码</h2>
            <p className="mt-3 text-sm text-ink-muted">正在校验重置链接…</p>
          </>
        ) : isRecovery ? (
          <>
            <h2 className="text-lg font-bold text-ink-primary">设置新密码</h2>
            <p className="mt-1 text-xs text-ink-muted">
              为账号 {session?.user?.email ?? ''} 设置一个新密码。
            </p>

            <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="新密码（至少6位）"
                rest={{ required: true, minLength: 6 }}
              />
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                placeholder="再次输入新密码"
                rest={{ required: true, minLength: 6 }}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-1 rounded-md bg-ustc-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
              >
                {busy ? '保存中…' : '确认重置'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-ink-muted">
              <Link to="/" className="font-medium text-ustc-blue hover:underline">
                返回登录
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-ink-primary">链接无效或已过期</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              未检测到有效的密码重置会话。请重新发起「忘记密码」，并确保使用邮件中的最新链接。
            </p>
            <p className="mt-4 text-center text-xs text-ink-muted">
              <Link to="/" className="font-medium text-ustc-blue hover:underline">
                返回首页
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
