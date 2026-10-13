/**
 * 图片引用解析层 —— 让「图片存在哪里」与「数据库里存什么」解耦。
 *
 * ══════════════════════════════════════════════════════════
 * 为什么需要这一层（可迁移性的核心）
 * ══════════════════════════════════════════════════════════
 * 反面设计（已废弃）：把绝对 URL 写进 posts.image_url，例如
 *     https://pan.ustc.edu.cn/seafdav/kela-images/2026-02/abc.jpg
 * 后果：一旦换存储（自建服务器/对象存储/CDN），历史图片的地址全部指向旧主机，
 *       要么整库 UPDATE 重写，要么全部裂图。这就是存储锁定。
 *
 * 正面设计（本文件）：数据库里只存【与主机无关的相对路径】，例如
 *     kela-images/2026-02/abc.jpg
 * 显示时才由 resolveImageUrl() 拼上【当前】base URL。
 * 迁移时只需改一个配置，全部历史图片自动跟着走 —— 不用碰数据库一行。
 *
 * 兼容性：旧数据里若已有绝对 URL（http/https 开头），原样返回，不受影响。
 */

/** 图片后端种类。 */
export type ImageBackend = 'seafile' | 'supabase' | 'custom'

/** 后端配置存 localStorage（切换迁移目标时改这里，不改代码）。 */
const CONFIG_KEY = 'keliao.storage.config'

export interface StorageConfig {
  /** 当前图片存到哪个后端。 */
  backend: ImageBackend
  /**
   * 自定义后端（自建服务器 / 对象存储 / CDN）的公开 base URL。
   * 一旦有了自己的服务器，填上它 + backend 设为 'custom' 即可完成迁移。
   * 例：https://cdn.example.com/kela
   */
  customBaseUrl: string
  /** 自定义后端的 WebDAV/上传地址（自建时用；纯静态 CDN 可留空，上传走别处）。 */
  customUploadUrl: string
}

const DEFAULT_CONFIG: StorageConfig = {
  backend: 'seafile',
  customBaseUrl: '',
  customUploadUrl: '',
}

/** 读取存储配置。 */
export function getStorageConfig(): StorageConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw) as Partial<StorageConfig>
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/** 保存存储配置。 */
export function saveStorageConfig(cfg: Partial<StorageConfig>): void {
  const next = { ...getStorageConfig(), ...cfg }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
}

// ──────────────────────────────────────────────
// 相对路径 ↔ 显示 URL
// ──────────────────────────────────────────────

/** 是否是「已经写死的绝对 URL」（旧数据 / Supabase 直链）。 */
export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * 把要存进数据库的值规范化成【相对路径】。
 * 已经是相对路径的原样返回；绝对 URL 保留（Supabase 桶直链本身就是稳定公开地址，
 * 且它跟我们的 base 配置无关，重写反而会破坏）。
 */
export function toStoredPath(value: string): string {
  return value.replace(/^\/+/, '')
}

/**
 * 把数据库里的值解析成浏览器可加载的 URL。
 *
 * @param stored posts.image_url 的原始值
 * @param resolveBase 把相对路径拼成 URL 的函数（由 storage.ts 按当前后端注入，
 *                    避免本文件反向依赖 webdav/supabase，防止循环引用）
 */
export function resolveImageUrl(
  stored: string,
  resolveBase: (relativePath: string) => string
): string {
  if (!stored) return ''
  // 绝对 URL（旧数据、Supabase 直链）原样使用 —— 保证向后兼容
  if (isAbsoluteUrl(stored)) return stored
  return resolveBase(stored)
}

/**
 * 生成迁移清单：把当前所有「相对路径」映射成目标 base 下的新 URL。
 * 纯函数，不联网 —— 迁移前可先用它预览会变成什么样。
 */
export function buildMigrationMap(
  storedPaths: string[],
  newBaseUrl: string
): { from: string; to: string }[] {
  const base = newBaseUrl.replace(/\/+$/, '')
  return storedPaths
    .filter((p) => p && !isAbsoluteUrl(p))
    .map((p) => ({
      from: p,
      to: `${base}/${p.replace(/^\/+/, '')}`,
    }))
}

// ──────────────────────────────────────────────
// 旧数据升级：绝对 URL → 相对路径（可选，针对早期直接存 absolute 的帖子）
// ──────────────────────────────────────────────

/**
 * 尝试把一个绝对 URL 还原成相对路径（用于把早期写死的 URL 归一化）。
 * 只有 URL 的前缀确实是「已知的旧 base」时才转换，否则放弃（返回 null），
 * 避免误伤 Supabase 直链或第三方图床。
 */
export function absoluteToRelative(
  absoluteUrl: string,
  knownOldBases: string[]
): string | null {
  for (const base of knownOldBases) {
    const clean = base.replace(/\/+$/, '')
    if (clean && absoluteUrl.startsWith(clean + '/')) {
      return decodeURIComponent(absoluteUrl.slice(clean.length + 1))
    }
  }
  return null
}
