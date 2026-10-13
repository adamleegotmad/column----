import { useEffect, useState } from 'react'
import { getCredentials, fetchAsObjectUrl } from '@/lib/webdav'
import { displayUrl, needsAuthToLoad } from '@/lib/storage'
import { isAbsoluteUrl } from '@/lib/imageRef'

interface PostImageProps {
  /** posts.image_url 的原始值：相对路径（新）或绝对 URL（旧/兼容） */
  stored: string
  className?: string
}

/**
 * 帖子配图。相比裸 <img>，它多处理两件真实情况：
 *
 * 1) 【地址解析】数据库里存的是相对路径，显示时才拼上当前后端 base。
 *    这样迁移存储时历史图片自动跟随，不用改数据库。
 *
 * 2) 【降级显示】Seafile 资料库没开匿名只读时，游客会拿到 401 → 图片裂掉。
 *    逐级降级：
 *      a. 直接 <img src>（公开只读已配置时这一级就成功）；
 *      b. 失败 + 本机有凭据 → 带凭据取 blob 显示（上传者本人可见）；
 *      c. 仍失败 → 显示明确的「图片打不开」占位，不留破图标。
 */
export default function PostImage({ stored, className }: PostImageProps) {
  const [src, setSrc] = useState(() => displayUrl(stored))
  const [failed, setFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    setSrc(displayUrl(stored))
    setFailed(false)
    setRetrying(false)
  }, [stored])

  const handleError = async () => {
    if (retrying) {
      setFailed(true)
      return
    }

    // 只有「相对路径 + 本机有凭据」才值得走 blob 重试
    if (isAbsoluteUrl(stored) || !needsAuthToLoad(stored)) {
      setFailed(true)
      return
    }

    const creds = getCredentials()
    if (!creds) {
      setFailed(true)
      return
    }

    setRetrying(true)
    try {
      const objectUrl = await fetchAsObjectUrl(creds, `/${stored.replace(/^\/+/, '')}`)
      setSrc(objectUrl)
    } catch {
      setFailed(true)
    }
  }

  if (failed) {
    return (
      <div className="mb-3.5 flex items-center gap-2 rounded-md border border-border-light bg-surface-secondary px-4 py-3 text-xs text-ink-muted">
        <span>🖼</span>
        <span>图片无法显示：存储端未开放匿名只读。上传者本人登录后可见。</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={handleError}
      className={className ?? 'mb-3.5 max-h-[360px] w-full rounded-md object-cover'}
    />
  )
}
