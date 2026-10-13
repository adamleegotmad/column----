/**
 * Seafile WebDAV 客户端（仅浏览器端使用）
 * ─────────────────────────────────────────
 * 为什么存在：把「帖子配图 / 附件」这类大文件交给校园 Seafile（pan.ustc.edu.cn/seafdav/），
 * 从而绕开 Supabase Storage 的容量与流量限制。数据库（帖子/点赞/评论/热词/公告）仍然走 Supabase，
 * 因为 WebDAV 是文件协议，不能替代 SQL 查询、事务与行级权限。
 *
 * 安全红线：本模块的账号密码来自 localStorage，是「用户自己的校园盘凭据」，
 * 绝不是站长的管理员账号。密码不上报、不写日志、不进 bundle、不进 git。
 *
 * 已知能力边界（见 README-DEV.md 第九节）：
 *   - Seafile WebDAV 需要上传者凭据，也【不能】生成公开分享链接（那是 /api2/ 的能力，WebDAV 不暴露）。
 *   - 因此「图片能对全体游客显示」依赖 Seafile 侧的一次性配置：把站长的 Seafile 资料库
 *     设为「公开只读 / 匿名可读」，图片才拿得到匿名可访问的 URL。详见 webdavPublicUrl()。
 */

/** 凭据在 localStorage 的键名（仅存本机，随浏览器走）。 */
const CRED_KEY = 'keliao.seafile.credentials'

export interface SeafileCredentials {
  /** WebDAV 基地址，例如 https://pan.ustc.edu.cn/seafdav/ */
  baseUrl: string
  /** 校园账号（学号或邮箱） */
  username: string
  /** 校园盘登录密码 */
  password: string
  /** 图片存放的资料库/目录前缀，例如 /kela-images */
  rootPath: string
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function normalizePath(path: string): string {
  const p = path.trim().replace(/^\/+|\/+$/g, '')
  return p ? `/${p}` : ''
}

/** 读取本机保存的凭据；没有则返回 null。 */
export function getCredentials(): SeafileCredentials | null {
  try {
    const raw = localStorage.getItem(CRED_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SeafileCredentials>
    if (!parsed.baseUrl || !parsed.username || !parsed.password) return null
    return {
      baseUrl: normalizeBase(parsed.baseUrl),
      username: parsed.username,
      password: parsed.password,
      rootPath: parsed.rootPath ? normalizePath(parsed.rootPath) : '',
    }
  } catch {
    return null
  }
}

/** 保存凭据到本机（用户主动填写后调用）。 */
export function saveCredentials(creds: SeafileCredentials): void {
  const clean: SeafileCredentials = {
    baseUrl: normalizeBase(creds.baseUrl),
    username: creds.username.trim(),
    password: creds.password,
    rootPath: normalizePath(creds.rootPath),
  }
  localStorage.setItem(CRED_KEY, JSON.stringify(clean))
}

/** 清除本机凭据（退出校园盘）。 */
export function clearCredentials(): void {
  localStorage.removeItem(CRED_KEY)
}

/** 是否已配置校园盘。 */
export function hasCredentials(): boolean {
  return getCredentials() !== null
}

/** Basic 认证头。用户名为空时返回 null —— 自建后端可能是匿名可写的。 */
function authHeader(creds: SeafileCredentials): string | null {
  if (!creds.username) return null
  const raw = `${creds.username}:${creds.password}`
  const bytes = new TextEncoder().encode(raw)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `Basic ${btoa(bin)}`
}

/** URI 逐段编码：中文文件名必须编码，否则 Seafile 会 404。 */
function encodePath(path: string): string {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

/** 拼出带认证头的完整请求 URL。 */
function urlFor(creds: SeafileCredentials, path: string): string {
  const full = `${creds.rootPath}${normalizePath(path)}`
  return `${creds.baseUrl}${encodePath(full)}`
}

async function davRequest(
  creds: SeafileCredentials,
  method: string,
  path: string,
  init: { body?: BodyInit | null; headers?: Record<string, string> } = {}
): Promise<Response> {
  const auth = authHeader(creds)
  const res = await fetch(urlFor(creds, path), {
    method,
    headers: {
      ...(auth ? { Authorization: auth } : {}),
      ...(init.headers ?? {}),
    },
    body: init.body ?? null,
  })

  // 401/403 统一翻译成人话，避免把原始状态码糊到用户脸上
  if (res.status === 401) {
    throw new Error('校园盘认证失败：账号或密码不正确（Seafile WebDAV 用的是登录密码）')
  }
  if (res.status === 403) {
    throw new Error('校园盘拒绝访问：该目录没有写入权限')
  }
  return res
}

/** 连通性自检：认证成功返回 true，凭据错误抛错。 */
export async function testConnection(creds: SeafileCredentials): Promise<boolean> {
  const res = await davRequest(creds, 'PROPFIND', '/', {
    headers: { Depth: '0', 'Content-Type': 'application/xml' },
    body: `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
  })
  // 207 = 目录列举成功；404 = 根路径不存在（但认证是通过的）
  return res.status === 207 || res.status === 404
}

/** 逐级创建目录（Seafile 的 MKCOL 不支持一次建多层）。已存在（405）视作成功。 */
export async function ensureDirectory(creds: SeafileCredentials, dirPath: string): Promise<void> {
  const parts = normalizePath(dirPath).split('/').filter(Boolean)
  let current = ''
  for (const part of parts) {
    current += `/${part}`
    try {
      const res = await davRequest(creds, 'MKCOL', current)
      // 201 新建成功；405 已存在 —— 两者都算通过
      if (res.status !== 201 && res.status !== 405) {
        // 其它状态码不致命（可能父目录只读），留给后续 PUT 报真实错误
      }
    } catch {
      // 目录可能已存在或父级受限，不阻断上传
    }
  }
}

/** 生成一个不会撞车的文件名，保留原始扩展名。 */
function uniqueFileName(originalName: string): string {
  const dot = originalName.lastIndexOf('.')
  const ext = dot > 0 ? originalName.slice(dot).toLowerCase() : ''
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${stamp}-${rand}${ext}`
}

export interface UploadResult {
  /** 上传到的绝对 WebDAV 路径，例如 /kela-images/2026/abc.jpg */
  path: string
  /** 可直接给 <img src> 用的 URL（匿名可读时有效） */
  url: string
  /** 服务端返回的 ETag（部分 Seafile 版本会带） */
  etag: string | null
}

/**
 * 上传一个文件（PUT）。
 * @param dirPath 目标目录，例如 /kela-images/2026-02
 */
export async function uploadFile(
  creds: SeafileCredentials,
  file: File,
  dirPath: string
): Promise<UploadResult> {
  await ensureDirectory(creds, dirPath)

  const fileName = uniqueFileName(file.name || 'file')
  const target = `${normalizePath(dirPath)}/${fileName}`

  const res = await davRequest(creds, 'PUT', target, {
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })

  if (res.status !== 201 && res.status !== 204) {
    const detail = await res.text().catch(() => '')
    throw new Error(`上传失败（HTTP ${res.status}）${detail ? `：${detail.slice(0, 200)}` : ''}`)
  }

  const fullPath = `${creds.rootPath}${target}`
  return {
    path: fullPath,
    url: webdavPublicUrl(creds, fullPath),
    etag: res.headers.get('etag'),
  }
}

/** 删除文件（发帖失败回滚时用，避免留下孤儿图片）。 */
export async function deleteFile(creds: SeafileCredentials, path: string): Promise<void> {
  await davRequest(creds, 'DELETE', path)
}

/**
 * 把 WebDAV 路径转成匿名可访问的 URL。
 *
 * ⚠️ 关键限制：Seafile 的 WebDAV 接口【强制认证】，匿名 GET 会 401。
 * 所以这个 URL 只有在 Seafile 侧把该资料库配成「匿名可读 / 公开只读」之后，
 * 才能被未登录的游客直接加载。三种办法（任选其一，都是 Seafile 后台的一次性操作）：
 *
 *   1) Seafile 后台把资料库设为「公开」，并把图片目录放到公开资料库里；
 *   2) 用 rclone / 反向代理把该资料库映射成一个匿名可读的静态目录；
 *   3) 在 nginx 上给 /seafdav/ 的 GET 开一条免认证的只读例外（仅 /kela-images/ 前缀）。
 *
 * 若都没做，前台 `getDisplayUrl()` 会回落到「带凭据的 blob 预览」，
 * 效果是：能上传成功、发布者本人能看到图，但其他游客看不到。
 */
export function webdavPublicUrl(creds: SeafileCredentials, path: string): string {
  return `${creds.baseUrl}${encodePath(path)}`
}

/**
 * 用当前凭据把图片「拉成 blob 再转 objectURL」显示。
 * 这是公开只读未配置时的兜底：只对已登录校园盘的本机有效，不能给其他游客看。
 * 调用方负责在用完后 URL.revokeObjectURL。
 */
export async function fetchAsObjectUrl(
  creds: SeafileCredentials,
  path: string
): Promise<string> {
  const res = await davRequest(creds, 'GET', path)
  if (!res.ok) throw new Error(`读取图片失败（HTTP ${res.status}）`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
