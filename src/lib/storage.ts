/**
 * 图片存储层：统一入口，对上层（Composer / data.ts）屏蔽「图存哪里」。
 *
 * 策略（按优先级）：
 *   1. backend='custom' 且填了 customBaseUrl → 上传到自己服务器的 WebDAV/接口（迁移目标）；
 *   2. 配了 Seafile 凭据 → 走校园盘 WebDAV（容量大）；
 *   3. 都没有 → 走 Supabase Storage 的 post-images 桶（兜底，保证功能不断）；
 *   4. 上述任何一个失败 → 自动回落 Supabase，并在控制台留下原因。
 *
 * 可迁移性关键：上传成功后【存进数据库的是相对路径】（如 kela-images/2026-02/abc.jpg），
 * 不是绝对 URL。换存储时只改配置，历史图片自动跟随，无需改数据库。
 * 详见 imageRef.ts 顶部的设计说明。
 */

import { supabase } from './supabase'
import {
  getCredentials,
  uploadFile,
  webdavPublicUrl,
  type SeafileCredentials,
} from './webdav'
import {
  getStorageConfig,
  toStoredPath,
  resolveImageUrl,
  isAbsoluteUrl,
  type StorageConfig,
} from './imageRef'

/** Supabase 兜底桶名（需在 Storage 里建 public 桶 post-images）。 */
const SUPABASE_BUCKET = 'post-images'

/** 单文件上限，防止有人往校园盘里塞视频。 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/** 允许的图片类型。 */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export interface StoredImage {
  /**
   * 写进 posts.image_url 的值。
   * 默认是【相对路径】；仅 Supabase 兜底时是绝对 URL（其公开直链本身就稳定）。
   */
  url: string
  /** 存储后端，便于排查与统计 */
  backend: 'seafile' | 'supabase' | 'custom'
  /** WebDAV 绝对路径，删除文件时需要 */
  path?: string
}

/** 上传前的本地校验：在上传前就给出明确原因，不浪费一次网络往返。 */
export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return '仅支持 JPG / PNG / GIF / WebP 图片'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `图片不能超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB`
  }
  return null
}

/** 按年月分目录，避免单目录堆几万个文件拖慢列举。 */
function monthDir(): string {
  const d = new Date()
  return `kela-images/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 生成不会撞车的文件名，保留原始扩展名。 */
function uniqueName(originalName: string): string {
  const dot = originalName.lastIndexOf('.')
  const ext = dot > 0 ? originalName.slice(dot).toLowerCase() : ''
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`
}

/** 走 Supabase Storage 兜底上传。返回绝对 URL（其公开直链稳定，无需解析）。 */
async function uploadToSupabase(file: File): Promise<StoredImage> {
  const path = `${monthDir()}/${uniqueName(file.name || 'image')}`

  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, backend: 'supabase' }
}

/** 用一份凭据（校园盘或自建 WebDAV）上传，返回相对路径。 */
async function uploadViaWebdav(
  creds: SeafileCredentials,
  file: File,
  backend: 'seafile' | 'custom'
): Promise<StoredImage> {
  const dir = monthDir()
  const r = await uploadFile(creds, file, dir)

  // 相对路径 = WebDAV 路径去掉 rootPath 前缀，这样换 base 时自然跟随
  const relative = toStoredPath(r.path)
  return { url: relative, backend, path: r.path }
}

/**
 * 上传一张图片。返回的 url 是要写进数据库的值（相对路径或 Supabase 绝对 URL）。
 */
export async function uploadImage(file: File): Promise<StoredImage> {
  const invalid = validateImage(file)
  if (invalid) throw new Error(invalid)

  const cfg = getStorageConfig()

  // 1) 自建服务器 / 对象存储（迁移目标）
  if (cfg.backend === 'custom' && cfg.customUploadUrl && cfg.customBaseUrl) {
    try {
      const creds: SeafileCredentials = {
        baseUrl: cfg.customUploadUrl.replace(/\/+$/, ''),
        username: '',
        password: '',
        rootPath: '',
      }
      return await uploadViaWebdav(creds, file, 'custom')
    } catch (err) {
      console.warn('[storage] 自建后端上传失败，尝试其它后端：', err)
    }
  }

  // 2) 校园盘
  const creds = getCredentials()
  if (creds && cfg.backend !== 'custom') {
    try {
      return await uploadViaWebdav(creds, file, 'seafile')
    } catch (err) {
      console.warn('[storage] Seafile 上传失败，回落到 Supabase Storage：', err)
    }
  }

  // 3) 兜底
  return uploadToSupabase(file)
}

/** 当前实际会使用的后端（用于设置界面提示）。 */
export function activeBackend(): 'seafile' | 'supabase' | 'custom' {
  const cfg = getStorageConfig()
  if (cfg.backend === 'custom' && cfg.customBaseUrl) return 'custom'
  return getCredentials() ? 'seafile' : 'supabase'
}

/**
 * 把数据库里的值（相对路径或旧绝对 URL）解析成可加载的 URL。
 * ★ 迁移的关键：换 base 后，所有相对路径自动指向新主机。
 */
export function displayUrl(stored: string): string {
  return resolveImageUrl(stored, (relative) => {
    const cfg = getStorageConfig()

    // 自建后端优先
    if (cfg.backend === 'custom' && cfg.customBaseUrl) {
      return `${cfg.customBaseUrl.replace(/\/+$/, '')}/${relative.replace(/^\/+/, '')}`
    }

    // 校园盘
    const creds = getCredentials()
    if (creds) {
      return webdavPublicUrl(creds, `/${relative.replace(/^\/+/, '')}`)
    }

    // 没配任何凭据：图片可能是站长的校园盘图，用公开默认地址兜底
    const DEFAULT_SEAFILE = 'https://pan.ustc.edu.cn/seafdav'
    return `${DEFAULT_SEAFILE}/${relative.replace(/^\/+/, '')}`
  })
}

/** 该图片是否托管在需要凭据的后端（决定 PostImage 要不要走 blob 降级）。 */
export function needsAuthToLoad(stored: string): boolean {
  if (isAbsoluteUrl(stored)) return false
  const cfg = getStorageConfig()
  if (cfg.backend === 'custom' && cfg.customBaseUrl) return false
  return getCredentials() !== null
}

export { webdavPublicUrl }
export type { SeafileCredentials, StorageConfig }
