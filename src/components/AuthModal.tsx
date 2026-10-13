import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Gender, Degree } from '@/lib/types'
import { GENDER_LABEL } from '@/lib/profile'
import { signIn, signUp, resetPasswordForEmail } from '@/lib/auth'
import EmailInput from '@/components/EmailInput'
import PasswordInput from '@/components/PasswordInput'
import IdentityFields from '@/components/IdentityFields'
import type { Identity } from '@/components/IdentityFields'

export type Mode = 'signin' | 'signup' | 'forgot'

interface AuthModalProps {
  mode: Mode
  onClose: () => void
  onSwitch: (m: Mode) => void
}

export default function AuthModal({ mode, onClose, onSwitch }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  // 注册时的身份信息（可选）：在校=入学年 / 校友=毕业年（单一年份值，提交时按身份映射）
  const [regIdentity, setRegIdentity] = useState<Identity>('student')
  const [regYear, setRegYear] = useState('')
  const [regDegree, setRegDegree] = useState<Degree | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      if (isForgot) {
        await resetPasswordForEmail(email.trim())
        setSent(true)
      } else if (isSignup) {
        await signUp(email.trim(), password, {
          nickname: nickname.trim() || null,
          real_name: realName.trim() || null,
          gender: gender || null,
          // 入学年 / 毕业年按身份映射；alumni_mode 保持 auto（按年自动判定）
          graduation_year: regIdentity === 'student' ? regYear.trim() || null : null,
          graduation_time: regIdentity === 'alumni' ? regYear.trim() || null : null,
          degree: regDegree || null,
          alumni_mode: 'auto',
        })
        alert('注册成功！请检查邮箱完成验证（如已关闭邮箱验证则已登录）。')
        onClose()
      } else {
        await signIn(email.trim(), password)
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-ink-primary">
          {isForgot ? '重置密码' : isSignup ? '注册账号' : '登录校友社区'}
        </h2>

        {isForgot && sent ? (
          <div className="text-sm leading-relaxed text-ink-secondary">
            <p className="text-ink-primary font-medium">重置邮件已发送 ✓</p>
            <p className="mt-2">
              我们已向 <span className="font-medium text-ustc-blue">{email.trim()}</span> 发送了一封重置密码的邮件，请点击邮件中的链接设置新密码。
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              如未收到，请检查垃圾邮件，或稍后再试。
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-md bg-ustc-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark"
            >
              知道了
            </button>
          </div>
        ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          {isForgot && (
            <p className="text-xs text-ink-muted">
              输入注册邮箱，我们会发送一封重置密码的邮件。
            </p>
          )}
          {isSignup && (
            <>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="昵称（公开展示用，可选）"
                className="rounded-md border-[1.5px] border-border p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
              />
              <input
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="真实姓名（可隐藏，可选）"
                className="rounded-md border-[1.5px] border-border p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
              />
              <div className="flex items-center gap-2 text-sm text-ink-secondary">
                <span>性别</span>
                {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
                  <label key={g} className="flex cursor-pointer items-center gap-1">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className="accent-ustc-blue"
                    />
                    <span>{GENDER_LABEL[g]}</span>
                  </label>
                ))}
              </div>

              {/* 身份信息（可选） */}
              <div className="rounded-md border border-border-light bg-surface-secondary p-3">
                <IdentityFields
                  identity={regIdentity}
                  onIdentityChange={setRegIdentity}
                  year={regYear}
                  onYearChange={setRegYear}
                  degree={regDegree}
                  onDegreeChange={setRegDegree}
                />
              </div>
            </>
          )}
          <EmailInput value={email} onChange={setEmail} placeholder="输入用户名" />
          <p className="text-xs text-ink-muted">仅支持 @mail.ustc.edu.cn / @ustc.edu.cn 邮箱，请在下方选择域名</p>
          {!isForgot && (
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="密码（至少6位）"
              rest={{ required: true, minLength: 6 }}
            />
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-md bg-ustc-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
          >
            {busy ? '请稍候…' : isForgot ? '发送重置邮件' : isSignup ? '注册' : '登录'}
          </button>

          {isSignup && (
            <p className="text-center text-xs text-ink-muted">
              目前暂未支持非人账户注册（企业 / 社团等），敬请期待！
            </p>
          )}
        </form>
        )}

        {!isForgot && (
          <p className="mt-4 text-center text-xs text-ink-muted">
            {isSignup ? '已有账号？' : '还没有账号？'}
            <button
              onClick={() => {
                setError(null)
                setSent(false)
                onSwitch(isSignup ? 'signin' : 'signup')
              }}
              className="ml-1 font-medium text-ustc-blue hover:underline"
            >
              {isSignup ? '去登录' : '去注册'}
            </button>
          </p>
        )}

        {mode === 'signin' && (
          <p className="mt-2 text-center text-xs text-ink-muted">
            <button
              onClick={() => {
                setError(null)
                setSent(false)
                onSwitch('forgot')
              }}
              className="font-medium text-ustc-blue hover:underline"
            >
              忘记密码？
            </button>
          </p>
        )}

        {isForgot && !sent && (
          <p className="mt-2 text-center text-xs text-ink-muted">
            <button
              onClick={() => {
                setError(null)
                setSent(false)
                onSwitch('signin')
              }}
              className="font-medium text-ustc-blue hover:underline"
            >
              返回登录
            </button>
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-2 w-full text-center text-xs text-ink-muted hover:text-ink-secondary"
        >
          关闭
        </button>
      </div>
    </div>,
    document.body
  )
}
