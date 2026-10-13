import { useEffect, useState } from 'react'
import type { Profile, Gender, Degree } from '@/lib/types'
import { GENDER_LABEL, isAlumni } from '@/lib/profile'
import { getProfile, updateProfile } from '@/lib/data'
import IdentityFields from '@/components/IdentityFields'
import type { Identity } from '@/components/IdentityFields'

interface ProfileViewProps {
  userId: string
  onBack: () => void
  onUpdated: (p: Profile) => void
}

/**
 * 个人资料二级菜单：昵称、真实姓名、性别、身份/年份/学位、展示姓名与收藏公开开关。
 * 加载与保存逻辑全部收敛在此子组件内，设置主列表不承载它们。
 */
export default function ProfileView({ userId, onBack, onUpdated }: ProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [identity, setIdentity] = useState<Identity>('student')
  // 单一年份：在校=入学年份；校友=毕业年份（提交时按身份映射到对应字段）
  const [year, setYear] = useState<string>('')
  const [degree, setDegree] = useState<Degree | ''>('')
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
        // 一级身份：按当前年份自动推断结果初始化（在校→在校，校友→校友）
        const alumni = isAlumni(p)
        setIdentity(alumni ? 'alumni' : 'student')
        // 年份：校友优先用毕业年（回退入学年）；在校用入学年
        setYear(alumni ? (p.graduation_time ?? p.graduation_year ?? '') : (p.graduation_year ?? ''))
        setDegree(p.degree ?? '')
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
        // 单一年份值按身份映射：在校=入学年，校友=毕业年
        graduation_year: identity === 'student' ? year.trim() || null : null,
        graduation_time: identity === 'alumni' ? year.trim() || null : null,
        // 学位层级
        degree: (degree || null) as Degree | null,
        // alumni_mode 保持 auto：最终在校/校友仍按年份自动推断，兼容统一身份认证后续强制赋值
        alumni_mode: 'auto' as const,
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

  return (
    <div>
      <div className="mb-4 flex items-center gap-1">
        <button
          onClick={onBack}
          aria-label="返回设置"
          className="-ml-1.5 rounded-md p-1.5 text-xl leading-none text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink-primary"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-ink-primary">个人资料</h2>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-ink-muted">加载中…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 真名显示开关 */}
          <div className="flex items-center justify-between rounded-md bg-surface-secondary px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-ink-primary">展示真实姓名</div>
              <div className="text-xs text-ink-muted">开启后，帖子将以真名展示；关闭则显示昵称</div>
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
              真实姓名 <span className="text-xs text-ink-muted">（之后由统一身份认证自动填充）</span>
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

          <div className="flex flex-col gap-3">
            <IdentityFields
              identity={identity}
              onIdentityChange={setIdentity}
              year={year}
              onYearChange={setYear}
              degree={degree}
              onDegreeChange={setDegree}
            />
            <span className="text-xs text-ink-muted">
              最终「在校/校友」将根据填写的年份自动判定；学位与年份可在接入统一身份认证后由学校数据自动填充。
            </span>
          </div>

          {/* 收藏公开开关 */}
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

          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-ustc-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
          >
            {busy ? '保存中…' : '保存'}
          </button>
        </div>
      )}
    </div>
  )
}
