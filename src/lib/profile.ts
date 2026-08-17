import type { Profile, Gender, ProfileType } from './types'

/**
 * 头像配色（按性别区分默认头像，未填性别用中性色）。
 * 暂用「底色 + 首字/图形」的纯 CSS 方案，后续可替换为图片 URL。
 */
const GENDER_STYLE: Record<Gender, { background: string; color: string }> = {
  male: { background: 'linear-gradient(135deg,#DCE8F8,#B9D3F2)', color: '#0055A4' },
  female: { background: 'linear-gradient(135deg,#FCE4EC,#F8BBD0)', color: '#C71585' },
}

const FALLBACK_STYLE = { background: 'linear-gradient(135deg,#E8F0FA,#D0E1F5)', color: '#0055A4' }

export function avatarStyle(profile: Pick<Profile, 'gender'> | null | undefined): {
  background: string
  color: string
} {
  const g = profile?.gender
  return (g && GENDER_STYLE[g]) || FALLBACK_STYLE
}

/**
 * 展示名：昵称优先 → 真名（若开启展示）→ full_name → 「校友」兜底。
 * 这是所有需要显示用户名字的地方统一调用的入口。
 */
export function displayName(profile: Profile | null | undefined): string {
  if (!profile) return '未知校友'
  if (profile.nickname) return profile.nickname
  if (profile.show_real_name && profile.real_name) return profile.real_name
  if (profile.full_name) return profile.full_name
  return '未知校友'
}

/** 头像里的字符：昵称/名字首字，兜底「科」。 */
export function avatarChar(profile: Profile | null | undefined): string {
  const name = displayName(profile)
  return name === '未知校友' ? '科' : name.charAt(0)
}

export const GENDER_LABEL: Record<Gender, string> = {
  male: '男',
  female: '女',
}

/** 性别图标，用于帖子等信息展示。 */
export const GENDER_ICON: Record<Gender, string> = {
  male: '♂',
  female: '♀',
}

/** 身份分类标签。 */
export const PROFILE_TYPE_LABEL: Record<ProfileType, string> = {
  alumni: '校友',
  company: '企业',
  lab: '实验室',
  club: '社团',
  department: '学校部门',
}

export const PROFILE_TYPE_ORDER: ProfileType[] = [
  'alumni',
  'company',
  'lab',
  'club',
  'department',
]

/**
 * 判定「在校」还是「校友」。
 * alumni_mode='alumni' 强制校友，'student' 强制在校；
 * 'auto' 时按「入学年份 + 4 年」自动判定（本科四年制假设）。
 */
export function isAlumni(profile: Pick<Profile, 'alumni_mode' | 'graduation_year'> | null | undefined): boolean {
  if (!profile) return true
  if (profile.alumni_mode === 'alumni') return true
  if (profile.alumni_mode === 'student') return false

  // auto：按入学年份判定
  const year = parseInt(profile.graduation_year ?? '', 10)
  if (!Number.isFinite(year)) return true // 无年份信息默认校友
  const currentYear = new Date().getFullYear()
  // 入学后 4 年内（含入学年 + 本科四年）算在校
  return currentYear - year >= 4
}

/** 生成「校友 · 14级」或「在校 · 21级」这样的标签文本。 */
export function alumniBadge(profile: Pick<Profile, 'alumni_mode' | 'graduation_year'> | null | undefined): string {
  const year = profile?.graduation_year ? String(profile.graduation_year).slice(2) : ''
  const suffix = year ? ` · ${year}级` : ''
  return isAlumni(profile) ? `校友${suffix}` : `在校${suffix}`
}