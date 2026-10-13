import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Profile } from '@/lib/types'
import { changePasswordWithOldPassword } from '@/lib/auth'
import ProfileView from '@/components/ProfileView'
import UpdateSection from '@/components/UpdateSection'
import SeafileSection from '@/components/SeafileSection'
import { FONT_SCALE_OPTIONS, getFontScale, setFontScale } from '@/lib/fontScale'
import PasswordInput from '@/components/PasswordInput'

interface SettingsModalProps {
  userId: string
  onClose: () => void
  onUpdated: (p: Profile) => void
}

/**
 * 修改密码二级菜单：验证当前密码（重新登录校验）后设置新密码。
 * 密码相关状态与逻辑全部收敛在此子组件内，设置主列表不承载它们。
 */
function ChangePasswordView({ onBack }: { onBack: () => void }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const changePassword = async () => {
    if (pwBusy) return
    setPwError(null)
    setPwSuccess(false)

    const old = oldPassword.trim()
    const next = newPassword.trim()
    if (!old) {
      setPwError('请输入当前密码')
      return
    }
    if (next.length < 6) {
      setPwError('新密码至少 6 位')
      return
    }
    if (next !== confirmPassword.trim()) {
      setPwError('两次输入的新密码不一致')
      return
    }

    setPwBusy(true)
    try {
      await changePasswordWithOldPassword(old, next)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : '修改失败')
    } finally {
      setPwBusy(false)
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
        <h2 className="text-lg font-bold text-ink-primary">修改密码</h2>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs text-ink-muted">输入当前密码验证身份，然后设置新密码。</p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-secondary">当前密码</span>
          <PasswordInput
            value={oldPassword}
            onChange={setOldPassword}
            placeholder="输入当前密码"
            rest={{ autoComplete: 'current-password' }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-secondary">新密码</span>
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder="新密码（至少6位）"
            rest={{ autoComplete: 'new-password' }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-secondary">确认新密码</span>
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="再次输入新密码"
            rest={{ autoComplete: 'new-password' }}
          />
        </label>

        {pwError && <p className="text-xs text-red-600">{pwError}</p>}
        {pwSuccess && <p className="text-xs text-emerald-600">密码已更新 ✓</p>}

        <button
          onClick={changePassword}
          disabled={pwBusy}
          className="rounded-md bg-ustc-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
        >
          {pwBusy ? '修改中…' : '修改密码'}
        </button>
      </div>
    </div>
  )
}

export default function SettingsModal({ userId, onClose, onUpdated }: SettingsModalProps) {
  // 全局字号（等比缩放，即时生效，无需保存）
  const [fontScale, setFontScaleState] = useState(getFontScale())
  // 视图层级：main = 设置主列表，profile = 个人资料，password = 修改密码
  const [view, setView] = useState<'main' | 'profile' | 'password'>('main')

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'password' ? (
          <ChangePasswordView onBack={() => setView('main')} />
        ) : view === 'profile' ? (
          <ProfileView userId={userId} onBack={() => setView('main')} onUpdated={onUpdated} />
        ) : (
          <>
            <h2 className="mb-4 text-lg font-bold text-ink-primary">设置</h2>

            <div className="flex flex-col gap-3">
              {/* 全局字号：等比缩放，标题/正文/辅助文字的相对大小保持不变，即时生效 */}
              <div className="flex items-center justify-between gap-3 rounded-md bg-surface-secondary px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink-primary">字体大小</div>
                  <div className="text-xs text-ink-muted">整体缩放，各部分比例不变</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {FONT_SCALE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => {
                        setFontScale(o.value)
                        setFontScaleState(o.value)
                      }}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        fontScale === o.value
                          ? 'bg-ustc-blue text-white'
                          : 'bg-surface text-ink-secondary hover:bg-ustc-blue-10'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 个人资料：二级菜单 */}
              <button
                onClick={() => setView('profile')}
                className="flex w-full items-center justify-between rounded-md bg-surface-secondary px-4 py-3 text-left transition-colors hover:bg-ustc-blue-10"
              >
                <div>
                  <div className="text-sm font-semibold text-ink-primary">个人资料</div>
                  <div className="text-xs text-ink-muted">昵称、真实姓名、性别、身份与隐私</div>
                </div>
                <span className="text-lg leading-none text-ink-muted">›</span>
              </button>

              {/* 修改密码：二级菜单 */}
              <button
                onClick={() => setView('password')}
                className="flex w-full items-center justify-between rounded-md bg-surface-secondary px-4 py-3 text-left transition-colors hover:bg-ustc-blue-10"
              >
                <div>
                  <div className="text-sm font-semibold text-ink-primary">修改密码</div>
                  <div className="text-xs text-ink-muted">验证当前密码后修改</div>
                </div>
                <span className="text-lg leading-none text-ink-muted">›</span>
              </button>

              {/* App 更新：仅原生壳内显示 */}
              <UpdateSection />

              {/* 校园盘：图片存储后端（未配置则自动用 Supabase） */}
              <SeafileSection />

              <button
                onClick={onClose}
                className="rounded-md border-[1.5px] border-border py-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-secondary"
              >
                关闭
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
