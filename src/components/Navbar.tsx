import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { signOut } from '@/lib/auth'
import type { Profile } from '@/lib/types'
import { avatarStyle, avatarChar, displayName, GENDER_ICON, PROFILE_TYPE_LABEL, alumniBadge } from '@/lib/profile'
import SettingsModal from '@/components/SettingsModal'
import AuthModal from '@/components/AuthModal'
import type { Mode } from '@/components/AuthModal'

interface NavbarProps {
  user: User | null
  profile?: Profile | null
  onProfileUpdated?: (p: Profile) => void
}

export default function Navbar({ user, profile, onProfileUpdated }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  const openModal = (m: Mode) => {
    setMode(m)
    setOpen(true)
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ustc-blue to-ustc-blue-dark text-lg font-bold text-white shadow-lg shadow-ustc-blue/20">
            科
          </div>
          <span className="text-xl font-bold tracking-tight text-ink-primary">科了</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={`/profile/${user.id}`}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-surface-secondary"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ring-ustc-blue/10"
                  style={{ ...avatarStyle(profile ?? null) }}
                >
                  {avatarChar(profile ?? null)}
                </div>
                <div className="hidden items-start flex-col leading-tight sm:flex">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-ink-primary">
                      {displayName(profile ?? null)}
                    </span>
                    {profile?.gender && (
                      <span
                        title={profile.gender === 'male' ? '男' : '女'}
                        className="text-xs"
                        style={{ color: profile.gender === 'male' ? '#0055A4' : '#C71585' }}
                      >
                        {GENDER_ICON[profile.gender]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-ustc-blue-10 px-2 py-0.5 text-[0.625rem] font-medium text-ustc-blue">
                      {profile?.profile_type && profile.profile_type !== 'alumni'
                        ? PROFILE_TYPE_LABEL[profile.profile_type]
                        : alumniBadge(profile)}
                    </span>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => setSettingsOpen(true)}
                title="个人设置"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-secondary hover:text-ink-primary"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={handleSignOut}
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openModal('signin')}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-secondary"
              >
                登录
              </button>
              <button
                onClick={() => openModal('signup')}
                className="rounded-xl bg-ustc-blue px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-ustc-blue/20 transition-all hover:bg-ustc-blue-dark hover:shadow-xl"
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
