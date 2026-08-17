import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Profile, Gender, ProfileType, AlumniMode } from '@/lib/types'
import { GENDER_LABEL, PROFILE_TYPE_LABEL, PROFILE_TYPE_ORDER, isAlumni } from '@/lib/profile'
import { getProfile, updateProfile } from '@/lib/data'

interface SettingsModalProps {
  userId: string
  onClose: () => void
  onUpdated: (p: Profile) => void
}

/** 生成入学年份下拉的候选（近 40 年，倒序）。 */
function enrollmentYears(): number[] {
  const current = new Date().getFullYear()
  const list: number[] = []
  for (let y = current; y >= current - 40; y--) list.push(y)
  return list
}

const ALUMNI_MODES: { value: AlumniMode; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'alumni', label: '校友' },
  { value: 'student', label: '在校' },
]

export default function SettingsModal({ userId, onClose, onUpdated }: SettingsModalProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [profileType, setProfileType] = useState<ProfileType | ''>('')
  const [enrollmentYear, setEnrollmentYear] = useState<string>('')
  const [alumniMode, setAlumniMode] = useState<AlumniMode>('auto')
  const [showRealName, setShowRealName] = useState(false)
  const [favoritesPublic, setFavoritesPublic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProfile(userId)
      .then((p) => {
        if (cancelled || !p) return
        setProfile(p)
        setNickname(p.nickname ?? '')
        setRealName(p.real_name ?? '')
        setGender(p.gender ?? '')
        setProfileType(p.profile_type ?? '')
        setEnrollmentYear(p.graduation_year ?? '')
        setAlumniMode(p.alumni_mode ?? 'auto')
        setShowRealName(p.show_real_name ?? false)
        setFavoritesPublic(p.favorites_public ?? false)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const save = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await updateProfile({
        nickname: nickname.trim() || null,
        real_name: realName.trim() || null,
        gender: (gender || null) as Gender | null,
        profile_type: (profileType || null) as ProfileType | null,
        graduation_year: enrollmentYear || null,
        alumni_mode: alumniMode,
        show_real_name: showRealName,
        favorites_public: favoritesPublic,
      })
      setProfile(updated)
      onUpdated(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-ink-primary">个人设置</h2>

        {loading ? (
          <p className="py-6 text-center text-sm text-ink-muted">加载中…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 真名显示开关 */}
            <div className="flex items-center justify-between rounded-md bg-surface-secondary px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-ink-primary">展示真实姓名</div>
                <div className="text-xs text-ink-muted">
                  开启后，帖子将以真名展示；关闭则显示昵称
                </div>
              </div>
              <button
                onClick={() => setShowRealName((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  showRealName ? 'bg-ustc-blue' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    showRealName ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-secondary">昵称</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="公开展示的名字"
                className="rounded-md border-[1.5px] border-border p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-secondary">
                真实姓名{' '}
                <span className="text-xs text-ink-muted">（之后由统一身份认证自动填充）</span>
              </span>
              <input
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="真实姓名"
                className="rounded-md border-[1.5px] border-border p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
              />
            </label>

            <div className="flex items-center gap-3 text-sm text-ink-secondary">
              <span className="font-medium">性别</span>
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

            <div className="flex items-center gap-3 text-sm text-ink-secondary">
              <span className="font-medium">身份分类</span>
              {PROFILE_TYPE_ORDER.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-1">
                  <input
                    type="radio"
                    name="profile_type"
                    value={t}
                    checked={profileType === t}
                    onChange={() => setProfileType(t)}
                    className="accent-ustc-blue"
                  />
                  <span>{PROFILE_TYPE_LABEL[t]}</span>
                </label>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-secondary">入学年份</span>
              <select
                value={enrollmentYear}
                onChange={(e) => setEnrollmentYear(e.target.value)}
                className="rounded-md border-[1.5px] border-border bg-surface p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
              >
                <option value="">未设置</option>
                {enrollmentYears().map((y) => (
                  <option key={y} value={String(y)}>
                    {y} 年
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-3 text-sm text-ink-secondary">
              <span className="font-medium">在校/校友</span>
              {ALUMNI_MODES.map((m) => (
                <label key={m.value} className="flex cursor-pointer items-center gap-1">
                  <input
                    type="radio"
                    name="alumni_mode"
                    value={m.value}
                    checked={alumniMode === m.value}
                    onChange={() => setAlumniMode(m.value)}
                    className="accent-ustc-blue"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
              <span className="text-xs text-ink-muted">
                {alumniMode === 'auto'
                  ? enrollmentYear
                    ? `将按入学 ${enrollmentYear} 自动判定为「${isAlumni({ alumni_mode: 'auto', graduation_year: enrollmentYear }) ? '校友' : '在校'}」`
                    : '选「自动」并填写入学年份后按年份判定'
                  : ''}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-md bg-surface-secondary px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-ink-primary">收藏对外公开</div>
                <div className="text-xs text-ink-muted">开启后，访客可在你的主页看到你的收藏</div>
              </div>
              <button
                onClick={() => setFavoritesPublic((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  favoritesPublic ? 'bg-ustc-blue' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    favoritesPublic ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {saved && <p className="text-xs text-emerald-600">已保存 ✓</p>}
            {profile && (
              <p className="text-xs text-ink-muted">
                当前展示为：<span className="font-medium text-ink-secondary">
                  {profile.nickname || (profile.show_real_name && profile.real_name) || profile.full_name || '未知校友'}
                </span>
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 rounded-md bg-ustc-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
              >
                {busy ? '保存中…' : '保存'}
              </button>
              <button
                onClick={onClose}
                className="rounded-md border-[1.5px] border-border px-5 py-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}