import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Gender, Profile } from '@/lib/types'
import { GENDER_LABEL, avatarStyle, avatarChar, displayName, GENDER_ICON, PROFILE_TYPE_LABEL, alumniBadge } from '@/lib/profile'
import SettingsModal from '@/components/SettingsModal'

interface NavbarProps {
  user: User | null
  profile?: Profile | null
  onProfileUpdated?: (p: Profile) => void
}

const links = [
  { label: '首页', href: '/', active: true },
  { label: '待开放', href: '/', active: false, coming: true },
]

type Mode = 'signin' | 'signup'

export default function Navbar({ user, profile, onProfileUpdated }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const openModal = (m: Mode) => {
    setMode(m)
    setOpen(true)
  }

  return (
    <nav className="sticky top-0 z-100 border-b border-border bg-white/85 px-6 backdrop-blur-[20px] backdrop-saturate-180">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 text-[22px] font-bold tracking-wide text-ustc-blue">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ustc-blue text-lg font-extrabold text-white">
            科
          </span>
          科了
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.coming ? undefined : l.href}
                onClick={
                  l.coming
                    ? (e) => {
                        e.preventDefault()
                        alert('该栏目待开放，敬请期待')
                      }
                    : undefined
                }
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  l.active
                    ? 'bg-ustc-blue-10 text-ustc-blue'
                    : 'text-ink-secondary hover:bg-ustc-blue-10 hover:text-ustc-blue'
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              {/* 用户信息卡：头像 + 昵称/真名 + 中国科大标签 */}
              <Link
                to={`/profile/${user.id}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-ustc-blue-10"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ ...avatarStyle(profile ?? null) }}
                >
                  {avatarChar(profile ?? null)}
                </div>
                <div className="hidden items-start flex-col leading-tight sm:flex">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-ink-primary">
                      {displayName(profile ?? null)}
                    </span>
                    {profile?.gender && (
                      <span
                        title={profile.gender === 'male' ? '男' : '女'}
                        className="text-xs font-bold"
                        style={{ color: profile.gender === 'male' ? '#0055A4' : '#C71585' }}
                      >
                        {GENDER_ICON[profile.gender]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {profile?.show_real_name && profile.real_name && profile.nickname && (
                      <span className="rounded bg-surface-secondary px-1 py-px text-[10px] text-ink-muted">
                        {profile.real_name}
                      </span>
                    )}
                    <span className="rounded-full bg-ustc-blue-light px-1.5 py-px text-[10px] font-semibold text-ustc-blue">
                      中国科大
                    </span>
                    {profile?.profile_type && profile.profile_type !== 'alumni' ? (
                      <span className="rounded-full bg-ustc-blue-light px-1.5 py-px text-[10px] font-semibold text-ustc-blue">
                        {PROFILE_TYPE_LABEL[profile.profile_type]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-ustc-blue-light px-1.5 py-px text-[10px] font-semibold text-ustc-blue">
                        {alumniBadge(profile)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => setSettingsOpen(true)}
                title="个人设置"
                className="px-2 py-2 text-sm text-ink-secondary transition-colors hover:text-ustc-blue"
              >
                ⚙️
              </button>
              <button
                onClick={handleSignOut}
                className="rounded-md border-[1.5px] border-ustc-blue px-5 py-2 text-sm font-semibold text-ustc-blue transition-colors hover:bg-ustc-blue-10"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openModal('signin')}
                className="rounded-md border-[1.5px] border-ustc-blue px-5 py-2 text-sm font-semibold text-ustc-blue transition-colors hover:bg-ustc-blue-10"
              >
                登录
              </button>
              <button
                onClick={() => openModal('signup')}
                className="rounded-md bg-ustc-blue px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark"
              >
                注册
              </button>
            </>
          )}
        </div>
      </div>

      {open && <AuthModal mode={mode} onClose={() => setOpen(false)} onSwitch={setMode} />}
      {settingsOpen && user && (
        <SettingsModal
          userId={user.id}
          onClose={() => setSettingsOpen(false)}
          onUpdated={(p) => onProfileUpdated?.(p)}
        />
      )}
    </nav>
  )
}

interface AuthModalProps {
  mode: Mode
  onClose: () => void
  onSwitch: (m: Mode) => void
}

function AuthModal({ mode, onClose, onSwitch }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSignup = mode === 'signup'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname: nickname.trim() || null,
              real_name: realName.trim() || null,
              gender: gender || null,
            },
          },
        })
        if (error) throw error
        alert('注册成功！请检查邮箱完成验证（如已关闭邮箱验证则已登录）。')
        onClose()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
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
          {isSignup ? '注册校友账号' : '登录校友社区'}
        </h2>

        <form onSubmit={submit} className="flex flex-col gap-3">
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
            </>
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="rounded-md border-[1.5px] border-border p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少6位）"
            className="rounded-md border-[1.5px] border-border p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-md bg-ustc-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
          >
            {busy ? '请稍候…' : isSignup ? '注册' : '登录'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-muted">
          {isSignup ? '已有账号？' : '还没有账号？'}
          <button
            onClick={() => {
              setError(null)
              onSwitch(isSignup ? 'signin' : 'signup')
            }}
            className="ml-1 font-medium text-ustc-blue hover:underline"
          >
            {isSignup ? '去登录' : '去注册'}
          </button>
        </p>

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