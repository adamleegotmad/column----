import { useState } from 'react'

interface ComposerProps {
  disabled: boolean
  onPublish: (body: string) => Promise<void>
}

const tools = [
  { icon: '🖼', title: '图片' },
  { icon: '#', title: '话题' },
  { icon: '@', title: '@校友' },
  { icon: '😊', title: '表情' },
]

export default function Composer({ disabled, onPublish }: ComposerProps) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const handlePublish = async () => {
    if (!body.trim() || busy) return
    setBusy(true)
    try {
      await onPublish(body.trim())
      setBody('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border-light bg-surface p-6 shadow-sm">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? '登录后即可发布动态…' : '分享你在科大的故事、近况，或者随便聊聊...'}
        className="min-h-20 w-full resize-none rounded-md border-[1.5px] border-border p-4 text-[15px] text-ink-primary outline-none transition-colors focus:border-ustc-blue disabled:opacity-60"
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {tools.map((t) => (
            <button
              key={t.title}
              title={t.title}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-md text-[17px] text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ustc-blue"
            >
              {t.icon}
            </button>
          ))}
        </div>
        <button
          onClick={handlePublish}
          disabled={disabled || !body.trim() || busy}
          className="rounded-md bg-ustc-blue px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? '发布中…' : '发布'}
        </button>
      </div>
    </div>
  )
}