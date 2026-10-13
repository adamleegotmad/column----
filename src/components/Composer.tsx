import { useEffect, useRef, useState } from 'react'
import { searchTopics } from '@/lib/data'
import type { Topic } from '@/lib/types'
import { compact } from '@/lib/format'
import { uploadImage, validateImage, activeBackend } from '@/lib/storage'

interface ComposerProps {
  disabled: boolean
  onPublish: (body: string, imageUrl?: string | null) => Promise<void>
}

const TOPIC_CHAR = /[一-龥A-Za-z0-9_\-]/

export default function Composer({ disabled, onPublish }: ComposerProps) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Topic[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const hashPosRef = useRef<number>(-1)

  const detectQuery = (value: string, cursor: number) => {
    const before = value.slice(0, cursor)
    const hashIdx = before.lastIndexOf('#')
    if (hashIdx === -1) return null

    const kw = before.slice(hashIdx + 1)
    if (kw.length === 0 || ![...kw].every((c) => TOPIC_CHAR.test(c))) return null

    return { hashIdx, kw }
  }

  useEffect(() => {
    if (!query) {
      setMatches([])
      setShowSuggest(false)
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const list = await searchTopics(query)
        if (!cancelled) {
          setMatches(list)
          setShowSuggest(true)
          setActiveIdx(0)
        }
      } catch {
        if (!cancelled) setMatches([])
      }
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursor = e.target.selectionStart ?? value.length
    setBody(value)

    const detected = detectQuery(value, cursor)
    if (detected) {
      hashPosRef.current = detected.hashIdx
      setQuery(detected.kw)
    } else {
      hashPosRef.current = -1
      setQuery('')
      setShowSuggest(false)
    }
  }

  const pickTopic = (t: Topic) => {
    const hashPos = hashPosRef.current
    if (hashPos < 0) return
    const ta = taRef.current
    const cursor = ta ? (ta.selectionStart ?? body.length) : body.length

    const before = body.slice(0, hashPos)
    const after = body.slice(cursor)
    const inserted = `#${t.name} `
    const next = before + inserted + after
    setBody(next)
    setQuery('')
    setShowSuggest(false)
    hashPosRef.current = -1

    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      const pos = before.length + inserted.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const insertHash = () => {
    if (disabled) return
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart ?? body.length
    const end = ta.selectionEnd ?? body.length
    const next = body.slice(0, start) + '#' + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + 1
      ta.setSelectionRange(pos, pos)
    })
    hashPosRef.current = start
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggest || matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      pickTopic(matches[activeIdx])
    } else if (e.key === 'Escape') {
      setShowSuggest(false)
    }
  }

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const invalid = validateImage(file)
    if (invalid) {
      setImageError(invalid)
      return
    }

    setImageError(null)
    setUploading(true)
    try {
      const stored = await uploadImage(file)
      setImageUrl(stored.url)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '图片上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handlePublish = async () => {
    if ((!body.trim() && !imageUrl) || busy || uploading) return
    setBusy(true)
    try {
      await onPublish(body.trim(), imageUrl)
      setBody('')
      setQuery('')
      setShowSuggest(false)
      setImageUrl(null)
      setImageError(null)
    } finally {
      setBusy(false)
    }
  }

  const backend = activeBackend()
  const canPublish = (!!body.trim() || !!imageUrl) && !busy && !uploading

  return (
    <div className="relative rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
      <textarea
        ref={taRef}
        value={body}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? '登录后即可发布动态…' : '分享你在科大的故事、近况，或输入 # 添加热词…'}
        className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-surface-secondary p-4 text-[0.9375rem] text-ink-primary outline-none transition-all focus:border-ustc-blue focus:bg-surface disabled:opacity-60"
      />

      {showSuggest && matches.length > 0 && (
        <div className="absolute z-30 mt-2 w-[calc(100%-3rem)] max-w-[420px] overflow-hidden rounded-xl border border-border/60 bg-surface shadow-lg">
          {matches.map((t, i) => (
            <button
              key={t.id}
              onMouseDown={(e) => {
                e.preventDefault()
                pickTopic(t)
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                i === activeIdx ? 'bg-ustc-blue-10' : 'hover:bg-surface-secondary'
              }`}
            >
              <span className="font-medium text-ink-primary">#{t.name}</span>
              <span className="shrink-0 text-xs text-ink-muted">
                {compact(t.mention_count)} 次提及
              </span>
            </button>
          ))}
        </div>
      )}

      {imageUrl && (
        <div className="relative mt-4 inline-block">
          <img
            src={imageUrl}
            alt="配图预览"
            className="max-h-40 rounded-xl border border-border object-cover"
          />
          <button
            onClick={() => setImageUrl(null)}
            title="移除配图"
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-primary/80 text-xs font-bold text-white transition-colors hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {imageError && (
        <p className="mt-2 text-xs text-red-600">{imageError}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={insertHash}
            disabled={disabled}
            title="话题"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-ink-muted transition-all hover:bg-surface-secondary hover:text-ustc-blue disabled:opacity-50"
          >
            #
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handlePickImage}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            title={backend === 'seafile' ? '添加图片（存校园盘）' : '添加图片'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-ink-muted transition-all hover:bg-surface-secondary hover:text-ustc-blue disabled:opacity-50"
          >
            {uploading ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <button
            disabled={disabled}
            title="表情（待实现）"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-ink-muted transition-all hover:bg-surface-secondary hover:text-ustc-blue disabled:opacity-50"
          >
            😊
          </button>

          <span className="ml-1 hidden text-[11px] text-ink-muted sm:inline">
            {backend === 'seafile' ? '图片存校园盘' : '图片存 Supabase'}
          </span>
        </div>

        <button
          onClick={handlePublish}
          disabled={disabled || !canPublish}
          className="rounded-xl bg-ustc-blue px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-ustc-blue/20 transition-all hover:bg-ustc-blue-dark hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {uploading ? '上传中…' : busy ? '发布中…' : '发布'}
        </button>
      </div>
    </div>
  )
}
