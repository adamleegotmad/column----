import { useState } from 'react'
import {
  getCredentials,
  saveCredentials,
  clearCredentials,
  testConnection,
  type SeafileCredentials,
} from '@/lib/webdav'
import { getStorageConfig, saveStorageConfig, type ImageBackend } from '@/lib/imageRef'

/** 默认 WebDAV 地址，省得用户手打。 */
const DEFAULT_BASE = 'https://pan.ustc.edu.cn/seafdav/'
const DEFAULT_ROOT = '/kela-images'

/**
 * 「校园盘（Seafile）」设置区块。
 *
 * 设计要点：
 *   - 凭据只存在本机 localStorage，不上传服务器。页面上明确写清楚这点，
 *     否则让用户往一个第三方站点里输校园网密码，是不会有任何人愿意填的。
 *   - 提供「测试连接」，避免填错了要等到发帖时才发现。
 *   - 不填也完全不影响使用：图片会自动走 Supabase Storage。
 */
export default function SeafileSection() {
  const saved = getCredentials()
  const cfg = getStorageConfig()
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? DEFAULT_BASE)
  const [username, setUsername] = useState(saved?.username ?? '')
  const [password, setPassword] = useState(saved?.password ?? '')
  const [rootPath, setRootPath] = useState(saved?.rootPath || DEFAULT_ROOT)
  const [showPassword, setShowPassword] = useState(false)

  // 迁移相关：切到自建服务器
  const [customBase, setCustomBase] = useState(cfg.customBaseUrl)
  const [customUpload, setCustomUpload] = useState(cfg.customUploadUrl)
  const [showMigrate, setShowMigrate] = useState(false)

  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [savedNow, setSavedNow] = useState(false)

  const creds = (): SeafileCredentials => ({ baseUrl, username, password, rootPath })

  const handleTest = async () => {
    if (testing) return
    if (!username || !password) {
      setMessage({ kind: 'err', text: '请先填写账号和密码' })
      return
    }
    setTesting(true)
    setMessage(null)
    try {
      await testConnection(creds())
      setMessage({ kind: 'ok', text: '连接成功，账号可用 ✓' })
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : '连接失败' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    if (!username || !password) {
      setMessage({ kind: 'err', text: '请先填写账号和密码' })
      return
    }
    saveCredentials(creds())
    setMessage({ kind: 'ok', text: '已保存到本机，之后发帖配图会直接存入校园盘' })
    setSavedNow(true)
    setTimeout(() => setSavedNow(false), 2000)
  }

  const handleClear = () => {
    clearCredentials()
    setPassword('')
    setMessage({ kind: 'ok', text: '已清除本机凭据，图片将改存 Supabase' })
  }

  const switchBackend = (backend: ImageBackend) => {
    saveStorageConfig({ backend, customBaseUrl: customBase, customUploadUrl: customUpload })
    setMessage({
      kind: 'ok',
      text:
        backend === 'custom'
          ? '已切换到自建存储；历史图片会自动指向新地址，无需改数据库'
          : '已切换回校园盘存储',
    })
  }

  return (
    <div className="rounded-md border border-border-light bg-surface-secondary p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-ink-primary">校园盘（Seafile）</div>
        <span className="text-xs text-ink-muted">
          {saved ? '已配置' : '未配置'}
        </span>
      </div>

      <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        把帖子配图存到你的科大校园网盘，绕开 Supabase 的容量限制。
        <br />
        凭据<span className="font-semibold text-ink-secondary">只保存在本机浏览器</span>
        ，不会上传到服务器，也不会写进代码。
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <label className="text-xs text-ink-secondary">
          WebDAV 地址
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={DEFAULT_BASE}
            className="mt-1 w-full rounded-md border-[1.5px] border-border bg-surface p-2 text-xs text-ink-primary outline-none focus:border-ustc-blue"
          />
        </label>

        <label className="text-xs text-ink-secondary">
          校园账号
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="学号或 @mail.ustc.edu.cn 邮箱"
            autoComplete="username"
            className="mt-1 w-full rounded-md border-[1.5px] border-border bg-surface p-2 text-xs text-ink-primary outline-none focus:border-ustc-blue"
          />
        </label>

        <label className="text-xs text-ink-secondary">
          校园盘密码
          <div className="mt-1 flex gap-1.5">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              placeholder="与登录 pan.ustc.edu.cn 相同"
              autoComplete="current-password"
              className="w-full rounded-md border-[1.5px] border-border bg-surface p-2 text-xs text-ink-primary outline-none focus:border-ustc-blue"
            />
            <button
              onClick={() => setShowPassword((v) => !v)}
              type="button"
              className="shrink-0 rounded-md border border-border px-2 text-xs text-ink-muted transition-colors hover:bg-surface"
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
          </div>
        </label>

        <label className="text-xs text-ink-secondary">
          图片目录
          <input
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value)}
            placeholder={DEFAULT_ROOT}
            className="mt-1 w-full rounded-md border-[1.5px] border-border bg-surface p-2 text-xs text-ink-primary outline-none focus:border-ustc-blue"
          />
        </label>
      </div>

      {message && (
        <p
          className={`mt-2.5 text-xs ${
            message.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex-1 rounded-md border-[1.5px] border-ustc-blue py-2 text-xs font-semibold text-ustc-blue transition-colors hover:bg-ustc-blue-10 disabled:opacity-50"
        >
          {testing ? '测试中…' : '测试连接'}
        </button>
        <button
          onClick={handleSave}
          className="flex-1 rounded-md bg-ustc-blue py-2 text-xs font-semibold text-white transition-colors hover:bg-ustc-blue-dark"
        >
          {savedNow ? '已保存 ✓' : '保存'}
        </button>
        {saved && (
          <button
            onClick={handleClear}
            className="rounded-md border border-border px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-surface hover:text-red-600"
          >
            清除
          </button>
        )}
      </div>

      <p className="mt-3 border-t border-border-light pt-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        ⚠️ 注意：Seafile 的 WebDAV 需要认证，无法生成公开分享链接。要让
        <span className="font-semibold">其他游客</span>也能看到图片，需要把校园盘里
        <span className="font-mono">{rootPath || DEFAULT_ROOT}</span>
        所在资料库设为「匿名可读 / 公开只读」。否则只有你本人登录后能看到图。
        <br />
        详见 README-DEV.md 第八节。
      </p>

      {/* ── 迁移：以后有了自己的服务器，切到这里 ── */}
      <div className="mt-3 border-t border-border-light pt-2.5">
        <button
          onClick={() => setShowMigrate((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs font-semibold text-ink-secondary">
            迁移到自建服务器
          </span>
          <span className="text-xs text-ink-muted">
            {cfg.backend === 'custom' && cfg.customBaseUrl ? '已启用' : '未启用'}
            {' '}{showMigrate ? '▲' : '▼'}
          </span>
        </button>

        {showMigrate && (
          <div className="mt-2.5 flex flex-col gap-2">
            <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
              数据库里存的是<span className="font-semibold">相对路径</span>
              （如 <span className="font-mono">kela-images/2026-02/a.jpg</span>），
              不是写死的网址。所以换服务器时改这里的地址即可，
              <span className="font-semibold">历史图片自动跟随，不用改数据库</span>。
            </p>

            <label className="text-xs text-ink-secondary">
              新存储的公开地址（用于显示图片）
              <input
                value={customBase}
                onChange={(e) => setCustomBase(e.target.value)}
                placeholder="https://cdn.example.com/kela"
                className="mt-1 w-full rounded-md border-[1.5px] border-border bg-surface p-2 text-xs text-ink-primary outline-none focus:border-ustc-blue"
              />
            </label>

            <label className="text-xs text-ink-secondary">
              新存储的上传地址（WebDAV，留空则仍用校园盘上传）
              <input
                value={customUpload}
                onChange={(e) => setCustomUpload(e.target.value)}
                placeholder="https://my-server.com/dav"
                className="mt-1 w-full rounded-md border-[1.5px] border-border bg-surface p-2 text-xs text-ink-primary outline-none focus:border-ustc-blue"
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => switchBackend('custom')}
                disabled={!customBase}
                className="flex-1 rounded-md bg-ustc-blue py-2 text-xs font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
              >
                切换到自建存储
              </button>
              <button
                onClick={() => switchBackend('seafile')}
                className="flex-1 rounded-md border-[1.5px] border-border py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface"
              >
                用回校园盘
              </button>
            </div>

            <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
              搬运已有文件用命令行（幂等，可重复跑）：
              <br />
              <span className="font-mono">
                node scripts/storage-migrate.mjs plan --new-base &lt;新地址&gt; --env-file .env
              </span>
              <br />
              <span className="font-mono">
                node scripts/storage-migrate.mjs copy --from-url ... --to-url ...
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
