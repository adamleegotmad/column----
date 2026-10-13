import { buildEmail, EMAIL_DOMAINS, localPart, selectedDomainOf } from '@/lib/email'
import type { EmailDomain } from '@/lib/email'

interface EmailInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

/**
 * 邮箱输入框（STRUCTURED，从根本上限制 USTC 域名）：
 * - 「用户名」为自由文本输入框，仅接受 @ 前的本地部分（输入 @ 会被去掉）。
 * - 「域名」为固定的两个按钮选项（mail.ustc.edu.cn / ustc.edu.cn），
 *   只能从中选择，无法手动输入其它域名，因此无法拼出非 USTC 邮箱。
 * - 选中域名后用 buildEmail 拼成完整邮箱，通过 onChange 上抛。
 * - 未选择域名时，value 仅为用户名（不含 @），提交时会被 assertAllowedEmail 兜底拦截。
 */
export default function EmailInput({ value, onChange, placeholder }: EmailInputProps) {
  const local = localPart(value)
  const selected = selectedDomainOf(value)

  // 用户名输入：仅保留本地部分，丢弃任何 @ 及其后的内容
  const handleLocalChange = (raw: string) => {
    const newLocal = raw.replace(/@.*/g, '')
    onChange(selected ? buildEmail(newLocal, selected) : newLocal)
  }

  const pickDomain = (domain: EmailDomain) => {
    onChange(buildEmail(local, domain))
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={local}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder={placeholder ?? '输入用户名'}
        autoComplete="username"
        className="w-full rounded-md border-[1.5px] border-border p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
      />

      {local.trim().length > 0 && (
        <div className="flex gap-2">
          {EMAIL_DOMAINS.map((d) => {
            const active = selected === d
            return (
              <button
                key={d}
                type="button"
                onClick={() => pickDomain(d)}
                className={`flex-1 rounded-md border-[1.5px] px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-ustc-blue bg-ustc-blue-10 text-ustc-blue'
                    : 'border-border text-ink-secondary hover:border-ustc-blue hover:bg-ustc-blue-10'
                }`}
              >
                @{d}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
