#!/usr/bin/env node
/**
 * 图片存储迁移工具
 * ══════════════════════════════════════════════════════════
 * 为什么这个脚本很轻：因为数据库里存的是【相对路径】而不是绝对 URL，
 * 所以「迁移」通常只需要改前端配置（设置 → 存储后端），根本不用动数据库。
 * 本脚本负责剩下的两步：
 *   1) (可选) migrate —— 把文件从旧 WebDAV 复制到新 WebDAV；
 *   2) list    —— 列出所有需要搬运的相对路径，供你核对。
 *
 * 用法：
 *   # 1. 先看有哪些图片、迁移后 URL 会变成什么（不联网，纯预览）
 *   node scripts/storage-migrate.mjs plan --new-base https://cdn.example.com/kela
 *
 *   # 2. 列出所有图片的相对路径（从 Supabase 读）
 *   node scripts/storage-migrate.mjs list
 *
 *   # 3. 真实搬运文件：旧源 → 新目标（两套 WebDAV 凭据）
 *   node scripts/storage-migrate.mjs copy \
 *     --from-url https://pan.ustc.edu.cn/seafdav --from-user 学号 --from-pass 密码 \
 *     --to-url   https://my-server.com/dav        --to-user user  --to-pass pass
 *
 * 环境变量（避免密码进 shell 历史）：
 *   SEAFILE_WEBDAV_URL / SEAFILE_USER / SEAFILE_PASS     旧源
 *   NEW_WEBDAV_URL / NEW_WEBDAV_USER / NEW_WEBDAV_PASS   新目标
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY             读帖子列表（也可用 --env-file .env）
 */

import { readFileSync } from 'node:fs'

// ── 参数解析 ──
const argv = process.argv.slice(2)
const cmd = argv[0]
function opt(name, fallback = '') {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

// 支持 --env-file .env 读取 Supabase 配置
const envFile = opt('env-file')
if (envFile) {
  try {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch (e) {
    console.error(`读取 ${envFile} 失败: ${e.message}`)
  }
}

const OLD = {
  url: opt('from-url', process.env.SEAFILE_WEBDAV_URL || 'https://pan.ustc.edu.cn/seafdav').replace(/\/+$/, ''),
  user: opt('from-user', process.env.SEAFILE_USER || ''),
  pass: opt('from-pass', process.env.SEAFILE_PASS || ''),
}
const NEW = {
  url: opt('to-url', process.env.NEW_WEBDAV_URL || '').replace(/\/+$/, ''),
  user: opt('to-user', process.env.NEW_WEBDAV_USER || ''),
  pass: opt('to-pass', process.env.NEW_WEBDAV_PASS || ''),
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function basic(user, pass) {
  if (!user) return null
  const bytes = new TextEncoder().encode(`${user}:${pass}`)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return 'Basic ' + Buffer.from(bin, 'binary').toString('base64')
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/')

/** 从 Supabase 读出所有非空的 image_url。 */
async function fetchStoredPaths() {
  if (!SUPABASE_URL || !SRK) {
    throw new Error('缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（可用 --env-file .env）')
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?select=id,image_url&image_url=not.is.null`,
    { headers: { apikey: SRK, Authorization: `Bearer ${SRK}` } }
  )
  if (!res.ok) throw new Error(`读 Supabase 失败 HTTP ${res.status}: ${await res.text()}`)
  return await res.json()
}

const isAbsolute = (v) => /^https?:\/\//i.test(v || '')

// ── 命令实现 ──
async function cmdList() {
  const rows = await fetchStoredPaths()
  console.log(`共 ${rows.length} 条带图帖子\n`)
  const relative = []
  const absolute = []
  for (const r of rows) {
    ;(isAbsolute(r.image_url) ? absolute : relative).push(r.image_url)
  }
  console.log(`【相对路径】${relative.length} 条 —— 迁移时自动跟随，无需改库：`)
  relative.forEach((p) => console.log(`   ${p}`))
  if (absolute.length) {
    console.log(`\n【绝对 URL】${absolute.length} 条 —— 已写死主机，迁移需单独处理：`)
    absolute.forEach((p) => console.log(`   ${p}`))
  }
  return relative
}

async function cmdPlan() {
  const newBase = opt('new-base', NEW.url)
  if (!newBase) {
    console.error('请用 --new-base 指定新的公开 base URL，例如 --new-base https://cdn.example.com/kela')
    process.exit(1)
  }
  const rows = await fetchStoredPaths()
  const relative = rows.map((r) => r.image_url).filter((v) => v && !isAbsolute(v))
  const base = newBase.replace(/\/+$/, '')

  console.log(`迁移预览：相对路径 → 新 base\n新 base: ${base}\n`)
  console.log(`共 ${relative.length} 条相对路径，迁移后 URL：\n`)
  relative.slice(0, 30).forEach((p) => {
    console.log(`  ${p}`)
    console.log(`    ⇒ ${base}/${p.replace(/^\/+/, '')}`)
  })
  if (relative.length > 30) console.log(`  … 其余 ${relative.length - 30} 条同理`)

  console.log('\n✅ 这些条目【不需要】改数据库。')
  console.log('   迁移后只需在「设置 → 存储后端」把 base 改成新地址，历史图片即刻生效。')
}

async function cmdCopy() {
  if (!OLD.url || !NEW.url) {
    console.error('请用 --from-url 和 --to-url 指定源与目标 WebDAV 地址')
    process.exit(1)
  }
  const rows = await fetchStoredPaths()
  const paths = rows.map((r) => r.image_url).filter((v) => v && !isAbsolute(v))

  if (paths.length === 0) {
    console.log('没有需要搬运的相对路径图片，无需迁移。')
    return
  }

  console.log(`准备搬运 ${paths.length} 个文件\n  从 ${OLD.url}\n  到 ${NEW.url}\n`)

  const oldAuth = basic(OLD.user, OLD.pass)
  const newAuth = basic(NEW.user, NEW.pass)

  let ok = 0
  let skip = 0
  let fail = 0

  for (const rel of paths) {
    const enc = encodePath('/' + rel.replace(/^\/+/, ''))
    try {
      // 目标已存在则跳过（幂等，可重复跑）
      const head = await fetch(NEW.url + enc, {
        method: 'HEAD',
        headers: newAuth ? { Authorization: newAuth } : {},
      })
      if (head.status === 200) {
        console.log(`⏭  已存在，跳过: ${rel}`)
        skip++
        continue
      }

      // 从旧源下载
      const src = await fetch(OLD.url + enc, {
        headers: oldAuth ? { Authorization: oldAuth } : {},
      })
      if (!src.ok) {
        console.log(`❌ 读取失败 HTTP ${src.status}: ${rel}`)
        fail++
        continue
      }
      const buf = Buffer.from(await src.arrayBuffer())

      // 逐级建目标目录
      const parts = rel.split('/').filter(Boolean)
      let acc = ''
      for (const seg of parts.slice(0, -1)) {
        acc += '/' + seg
        await fetch(NEW.url + encodePath(acc), {
          method: 'MKCOL',
          headers: newAuth ? { Authorization: newAuth } : {},
        }).catch(() => {})
      }

      // 上传到新目标
      const put = await fetch(NEW.url + enc, {
        method: 'PUT',
        headers: {
          ...(newAuth ? { Authorization: newAuth } : {}),
          'Content-Type': src.headers.get('content-type') || 'application/octet-stream',
        },
        body: buf,
      })
      if (put.status === 201 || put.status === 204) {
        console.log(`✅ ${rel}  (${(buf.length / 1024).toFixed(0)} KB)`)
        ok++
      } else {
        console.log(`❌ 上传失败 HTTP ${put.status}: ${rel}`)
        fail++
      }
    } catch (e) {
      console.log(`❌ ${rel}: ${e.message}`)
      fail++
    }
  }

  console.log(`\n完成：成功 ${ok}，跳过 ${skip}，失败 ${fail}`)
  console.log('数据库【无需修改】—— 相对路径会自动指向新 base。')
  console.log('记得在「设置 → 存储后端」填入新的公开 base URL。')
  process.exitCode = fail > 0 ? 1 : 0
}

const commands = { list: cmdList, plan: cmdPlan, copy: cmdCopy }

if (!cmd || !commands[cmd]) {
  console.log('用法: node scripts/storage-migrate.mjs <list|plan|copy> [选项]')
  console.log('  list  – 列出所有图片路径（区分相对/绝对）')
  console.log('  plan  – 预览迁移后的 URL（--new-base <url>）')
  console.log('  copy  – 把文件从旧 WebDAV 搬到新 WebDAV')
  process.exit(cmd ? 1 : 0)
}

await commands[cmd]()
