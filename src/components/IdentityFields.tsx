import type { Degree } from '@/lib/types'
import { DEGREE_LABEL, DEGREE_ORDER } from '@/lib/profile'
import { yearOptions } from '@/lib/format'

export type Identity = 'student' | 'alumni'

interface IdentityFieldsProps {
  /** 一级身份：student=在校 / alumni=校友 */
  identity: Identity
  onIdentityChange: (v: Identity) => void
  /** 二级年份值：在校=入学年份；校友=毕业年份（由调用方映射到对应字段） */
  year: string
  onYearChange: (v: string) => void
  /** 学位层级 */
  degree: Degree | ''
  onDegreeChange: (v: Degree | '') => void
}

/**
 * 可复用的「在校/校友 → 入学/毕业年份 → 学位」表单组件。
 * 同时服务于注册弹窗与设置弹窗，避免重复实现。
 * 受控组件：状态全部由父级持有，切换一级身份时会清空年份值。
 */
export default function IdentityFields({
  identity,
  onIdentityChange,
  year,
  onYearChange,
  degree,
  onDegreeChange,
}: IdentityFieldsProps) {
  const isStudent = identity === 'student'

  return (
    <div className="flex flex-col gap-3">
      <span className="font-medium text-ink-secondary">身份</span>
      <div className="flex items-center gap-3 text-sm">
        {(['student', 'alumni'] as Identity[]).map((v) => (
          <label key={v} className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="identity"
              value={v}
              checked={identity === v}
              onChange={() => {
                onIdentityChange(v)
                onYearChange('') // 切换身份时清空年份，避免语义残留
              }}
              className="accent-ustc-blue"
            />
            <span>{v === 'student' ? '在校' : '校友'}</span>
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-secondary">
          {isStudent ? '入学年份' : '毕业年份'}
        </span>
        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className="rounded-md border-[1.5px] border-border bg-surface p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
        >
          <option value="">未设置</option>
          {yearOptions().map((y) => (
            <option key={y} value={String(y)}>
              {y} 年
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-secondary">学位</span>
        <div className="flex flex-wrap items-center gap-3">
          {DEGREE_ORDER.map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-1">
              <input
                type="radio"
                name="degree"
                value={d}
                checked={degree === d}
                onChange={() => onDegreeChange(d)}
                className="accent-ustc-blue"
              />
              <span>{DEGREE_LABEL[d]}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
