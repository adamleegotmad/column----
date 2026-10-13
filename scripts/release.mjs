#!/usr/bin/env node
/**
 * 一键发版：读取 android/app/build.gradle 的版本号，把 APK 与 version.json
 * 上传到 Supabase Storage 公共桶 app-releases。
 * 上传成功后，App 内「检查更新」与网页版页脚下载按钮即刻生效（version.json 每次请求都不走缓存）。
 *
 * 用法：
 *   1. .env 中补充 SUPABASE_SERVICE_ROLE_KEY（Dashboard → Settings → API → service_role key，切勿提交到 git）
 *   2. 先在 Android Studio 出包：Build → Generate Signed App Bundle or APK → APK
 *   3. npm run release                          # 自动找 release 目录里最新的 APK（找不到再找 debug）
 *      或 npm run release -- 路径/xxx.apk "版本说明"   # 手动指定 APK 与更新说明
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// 1. 读取版本号
const gradle = readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8')
const code = Number(gradle.match(/versionCode\s+(\d+)/)?.[1])
const name = gradle.match(/versionName\s+"([^"]+)"/)?.[1]
if (!code || !name) fail('无法从 android/app/build.gradle 解析 versionCode / versionName')

// 2. 定位 APK
function findApk() {
  for (const d of [
    'android/app/build/outputs/apk/release',
    'android/app/build/outputs/apk/debug',
  ]) {
    const dir = path.join(root, d)
    if (!existsSync(dir)) continue
    const apks = readdirSync(dir)
      .filter((f) => f.endsWith('.apk'))
      .map((f) => ({ f, m: statSync(path.join(dir, f)).mtimeMs }))
    if (apks.length) {
      apks.sort((a, b) => b.m - a.m)
      return path.join(dir, apks[0].f)
    }
  }
  return null
}

const apkPath = process.argv[2] ? path.resolve(process.argv[2]) : findApk()
if (!apkPath || !existsSync(apkPath)) {
  fail('未找到 APK。请先在 Android Studio 出包（Build → Generate Signed App Bundle or APK），或用 npm run release -- <apk路径> 指定')
}
const notes = process.argv[3] || process.env.RELEASE_NOTES || ''

// 3. 上传
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || fail('缺少 VITE_SUPABASE_URL（.env）'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠ 未设置 SUPABASE_SERVICE_ROLE_KEY，将用 anon key 上传；若被桶权限拒绝，请在 .env 补充 service_role key。')
}

const bucket = 'app-releases'
const apkName = 'app-release.apk'
const apkBuffer = readFileSync(apkPath)

console.log(`版本：${name} (build ${code})`)
console.log(`APK：${path.relative(root, apkPath)}（${(apkBuffer.length / 1024 / 1024).toFixed(2)} MB）`)
if (notes) console.log(`说明：${notes}`)

const { error: apkErr } = await supabase.storage.from(bucket).upload(apkName, apkBuffer, {
  upsert: true,
  contentType: 'application/vnd.android.package-archive',
})
if (apkErr) {
  fail(
    `APK 上传失败：${apkErr.message}\n` +
      '请检查：① 已在 Supabase 创建公共桶 app-releases（Public）；② SUPABASE_SERVICE_ROLE_KEY 正确'
  )
}
const apkUrl = supabase.storage.from(bucket).getPublicUrl(apkName).data.publicUrl

const version = {
  versionName: name,
  versionCode: code,
  apkUrl,
  ...(notes ? { notes } : {}),
  publishedAt: new Date().toISOString(),
}
const { error: verErr } = await supabase.storage
  .from(bucket)
  .upload('version.json', Buffer.from(JSON.stringify(version, null, 2)), {
    upsert: true,
    contentType: 'application/json',
  })
if (verErr) fail(`version.json 上传失败：${verErr.message}`)

console.log('')
console.log('✓ 发版成功！')
console.log(`APK 下载地址：${apkUrl}`)
console.log('App 内「检查更新」与网页版页脚下载按钮即刻生效。')
