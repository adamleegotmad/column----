#!/usr/bin/env node
/**
 * 发布 / 下线公告，写入 Supabase 的 announcements 表（用 service_role key 绕过 RLS）。
 * 发布后，网站顶端滚动横幅立即显示；若带 --popup，App 下次打开会弹窗。
 *
 * 发布用法：
 *   node --env-file=.env scripts/announce.mjs "标题" "正文" [--category 公告|更新|停服] [--banner] [--popup] [--no-banner]
 *
 * 下线用法（首参 --off）：
 *   node --env-file=.env scripts/announce.mjs --off            # 下线全部
 *   node --env-file=.env scripts/announce.mjs --off "关键词"    # 下线标题/正文含关键词的公告
 *
 * 发布示例：
 *   npm run announce -- "5月1日停服维护" "凌晨 2:00-4:00 升级数据库，期间无法使用" --category 停服 --banner --popup
 *   npm run announce -- "v0.0.2 已发布" "新增热词排行榜、删帖功能" --category 更新 --popup
 *
 * 下线示例：
 *   npm run announce -- --off
 *   npm run announce -- --off "停服"
 *
 * 说明：
 *   发布默认 show_banner=true（网站横幅）、show_popup=false（不弹窗）。
 *   用 --popup 开启 App 弹窗；用 --no-banner 关闭网站横幅。
 */
import { createClient } from '@supabase/supabase-js'

const firstArg = process.argv[2] ?? ''
const isOff = firstArg === '--off'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!url) {
  console.error('✗ 缺少 VITE_SUPABASE_URL（.env）')
  process.exit(1)
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠ 未设置 SUPABASE_SERVICE_ROLE_KEY，将用 anon key；若被 RLS 拒绝请补充 service_role key。')
}
const supabase = createClient(url, key)

// ── 下线模式 ──
if (isOff) {
  const kw = process.argv[3] ?? ''
  let q = supabase.from('announcements').update({ active: false })
  if (kw) q = q.or(`title.ilike.%${kw}%,content.ilike.%${kw}%`)

  const { data, error } = await q.select('id, title, category')

  if (error) {
    console.error(`✗ 下线失败：${error.message}`)
    console.error('请确认已执行 supabase/migration_announcements.sql 建表。')
    process.exit(1)
  }
  const n = (data ?? []).length
  if (n === 0) {
    console.log('没有匹配的生效公告（可能本就不存在或已下线）。')
  } else {
    console.log(`✓ 已下线 ${n} 条公告：`)
    for (const a of data ?? []) console.log(`  - [${a.category}] ${a.title}`)
  }
  process.exit(0)
}

// ── 发布模式 ──
const title = firstArg
const content = process.argv[3] ?? null

if (!title) {
  console.error('✗ 用法：npm run announce -- "标题" ["正文"] [--category 公告|更新|停服] [--banner] [--popup] [--no-banner]')
  console.error('   下线：npm run announce -- --off ["关键词"]')
  process.exit(1)
}

// 解析 flag
const rest = process.argv.slice(4)
let category = '公告'
let showBanner = true
let showPopup = false
for (const a of rest) {
  if (a.startsWith('--category')) {
    category = a.includes('=') ? a.split('=')[1] : rest[rest.indexOf(a) + 1]
  } else if (a === '--banner') {
    showBanner = true
  } else if (a === '--no-banner') {
    showBanner = false
  } else if (a === '--popup') {
    showPopup = true
  }
}
if (!['公告', '更新', '停服'].includes(category)) category = '公告'

const { data, error } = await supabase
  .from('announcements')
  .insert({
    title,
    content,
    category,
    active: true,
    show_banner: showBanner,
    show_popup: showPopup,
  })
  .select('id, title, category, show_banner, show_popup')
  .single()

if (error) {
  console.error(`✗ 发布失败：${error.message}`)
  console.error('请确认：① 已执行 supabase/migration_announcements.sql 建表；② 服务端 key 正确。')
  process.exit(1)
}

console.log('')
console.log('✓ 公告发布成功！')
console.log(`  标题：${data.title}`)
console.log(`  分类：${data.category}`)
console.log(`  网站横幅：${data.show_banner ? '是（滚动显示）' : '否'}`)
console.log(`  App 弹窗：${data.show_popup ? '是（首次打开弹窗）' : '否'}`)
if (!data.show_banner && !data.show_popup) {
  console.warn('⚠ 注意：横幅和弹窗都关闭了，这条公告不会展示！')
}
