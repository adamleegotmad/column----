#!/usr/bin/env node
/**
 * 一键发版：ship = 递增版本号 → 构建网页 → 同步原生工程 → 打 APK → 上传 Supabase。
 *
 * 用法：
 *   npm run ship                    # versionName 自动 patch+1（0.0.1→0.0.2→…），versionCode 自动 +1
 *   npm run ship 0.0.1              # versionName 显式设为 0.0.1，versionCode 自动 +1
 *   npm run ship 0.0.1 "修复了xx"   # 额外携带更新说明（写入 version.json）
 *
 * 版本序列（自动递增，无需手动维护）：
 *   versionCode 3 → 4 → 5 → … ，versionName 0.0.1 → 0.0.2 → … → 0.0.9 → 0.0.10 → …
 *
 * 前置：
 *   .env 已填 VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY（上传用，见 .env.example）
 *   本机有 JDK 21（会自动探测 ~/.jdks 或 Android Studio 自带 JBR）
 *   本机有 Android SDK（默认探测 %LOCALAPPDATA%\Android\Sdk）
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gradleFile = path.join(root, 'android/app/build.gradle')

function log(msg) { console.log(msg) }
function fail(msg) { console.error(`✗ ${msg}`); process.exit(1) }

// ---------- 环境探测 ----------
function firstDirWithJava(dirs) {
  for (const d of dirs) {
    if (!d || !existsSync(d)) continue
    if (existsSync(path.join(d, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) return d
    // 也支持 *\jdk-*\** 这种嵌套（如 .jdks 下的子目录）
    let children = []
    try { children = readdirSync(d) } catch { continue }
    for (const c of children) {
      const sub = path.join(d, c)
      if (existsSync(path.join(sub, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) return sub
    }
  }
  return null
}

function locateJava() {
  const isWin = process.platform === 'win32'
  const candidates = []
  // 1) IDE 下载的 JDK（按版本目录名优先 17/21）
  const jdks = path.join(isWin ? process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local') : homedir(), '.jdks')
  if (existsSync(jdks)) {
    let names = []
    try { names = readdirSync(jdks) } catch {}
    // 优先 21，其次 17，最后任意
    const pick = (re) => names.find((n) => re.test(n))
    for (const n of [pick(/21/), pick(/17/), names[0]]) {
      if (n) candidates.push(path.join(jdks, n))
    }
  }
  // 2) Android Studio 自带 JBR
  for (const p of [
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    '/Applications/Android Studio.app/Contents/jbr',
  ]) candidates.push(p)
  // 3) 常见 OpenJDK 发行版目录
  for (const base of [
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Amazon Corretto',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Zulu',
    '/Library/Java/JavaVirtualMachines',
  ]) {
    if (existsSync(base)) {
      try { for (const c of readdirSync(base)) candidates.push(path.join(base, c)) } catch {}
    }
  }
  return firstDirWithJava(candidates)
}

function locateSdk() {
  const isWin = process.platform === 'win32'
  const local = isWin
    ? path.join(process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local'), 'Android', 'Sdk')
    : path.join(homedir(), 'Library', 'Android', 'sdk')
  if (existsSync(local)) return local
  if (existsSync('C:\\Android\\Sdk')) return 'C:\\Android\\Sdk'
  return null
}

// ---------- 版本号读写 ----------
/** 自动递增 patch 位：0.0.1 → 0.0.2 … 0.0.9 → 0.0.10（自然进位，不会停在 9） */
function incPatch(versionName) {
  const m = versionName.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/)
  if (!m) return versionName // 非 x.y.z 格式则原样返回
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}${m[4] ?? ''}`
}

/**
 * 递增版本号：
 * - 显式传入 newName → versionName 设为 newName
 * - 未传 → versionName 自动 patch +1（0.0.1→0.0.2→…）
 * - versionCode 始终 +1
 */
function bumpVersion(newName) {
  const src = readFileSync(gradleFile, 'utf8')
  const codeMatch = src.match(/versionCode\s+(\d+)/)
  if (!codeMatch) fail('无法在 android/app/build.gradle 中找到 versionCode')
  const oldCode = Number(codeMatch[1])
  const newCode = oldCode + 1

  let out = src.replace(/versionCode\s+\d+/, `versionCode ${newCode}`)

  const nameMatch = out.match(/versionName\s+"([^"]+)"/)
  if (!nameMatch) fail('无法在 build.gradle 中找到 versionName')
  const oldName = nameMatch[1]

  let finalName
  if (newName) {
    // 显式指定
    finalName = newName
  } else {
    // 自动递增 patch 位
    finalName = incPatch(oldName)
  }
  out = out.replace(/versionName\s+"[^"]+"/, `versionName "${finalName}"`)

  writeFileSync(gradleFile, out)
  log(`① 版本号：${oldName} (build ${oldCode}) → ${finalName} (build ${newCode})${newName ? '' : '  [自动递增]'}`)
  return { code: newCode, name: finalName }
}

// ---------- 命令执行 ----------
function run(cmd, args, opts = {}) {
  log(`\n▶ ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: opts.shell ?? false, cwd: opts.cwd, env: opts.env })
  if (r.status !== 0) fail(`命令失败：${cmd} ${args.join(' ')}`)
}

// 用当前 node 调 npm（无 shell，避免 .cmd 转义问题）
function runNpm(scriptName) {
  const npmCli = process.env.npm_execpath
  if (npmCli) {
    run(process.execPath, [npmCli, 'run', scriptName])
  } else {
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', scriptName], { shell: true })
  }
}

// ---------- 主流程 ----------
async function main() {
  const newName = process.argv[2] || null
  const notes = process.argv[3] || process.env.RELEASE_NOTES || ''

  // 0) 准备环境变量
  if (!process.env.JAVA_HOME) {
    const j = locateJava()
    if (j) { process.env.JAVA_HOME = j; log(`   JAVA_HOME 未设置，已自动探测为 ${j}`) }
    else fail('未找到 JDK。请设置 JAVA_HOME 指向 JDK 17/21。')
  }
  if (!process.env.ANDROID_HOME) {
    const s = process.env.ANDROID_SDK_ROOT || locateSdk()
    if (s) { process.env.ANDROID_HOME = s; process.env.ANDROID_SDK_ROOT = s; log(`   ANDROID_HOME 未设置，已自动探测为 ${s}`) }
    else fail('未找到 Android SDK。请设置 ANDROID_HOME。')
  }

  // 1) 递增版本号
  const ver = bumpVersion(newName)

  // 2) 构建网页 + 3) 同步原生工程
  runNpm('build')
  runNpm('cap:sync')

  // 4) 打 debug APK
  const isWin = process.platform === 'win32'
  const gradlew = isWin ? 'gradlew.bat' : './gradlew'
  run(gradlew, ['assembleDebug', '--console=plain'], { cwd: path.join(root, 'android'), shell: isWin })

  // 5) 上传（复用 release.mjs，显式指定刚产出的 debug APK，避免误传旧 release 包）
  const apkPath = path.join(root, `android/app/build/outputs/apk/debug/app-debug-${ver.name}.apk`)
  if (!existsSync(apkPath)) fail(`未找到 APK：${apkPath}`)
  const apkMb = (statSync(apkPath).size / 1024 / 1024).toFixed(2)
  log(`\n② 上传 ${ver.name} (build ${ver.code}) · ${apkMb} MB`)

  run(process.execPath, [path.join(root, 'scripts/release.mjs'), apkPath, notes], {
    env: { ...process.env, RELEASE_NOTES: notes },
  })

  log('\n🎉 发版完成！App 内「检查更新」与网页版下载链接即刻生效。')
}

main().catch((e) => fail(e instanceof Error ? (e.message || e.stack) : String(e)))
