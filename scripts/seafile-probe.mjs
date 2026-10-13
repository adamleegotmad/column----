// Seafile WebDAV 连通性探测（只读，不写任何数据）
// 用法: node scripts/seafile-probe.mjs
// 若设置了 SEAFILE_USER / SEAFILE_PASS，会额外做一次带认证的 PROPFIND。

const BASE = process.env.SEAFILE_WEBDAV_URL || 'https://pan.ustc.edu.cn/seafdav/'
const USER = process.env.SEAFILE_USER || ''
const PASS = process.env.SEAFILE_PASS || ''

const authHeader = USER ? 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64') : null

async function req(method, path = '', { auth = false, body = null, headers = {} } = {}) {
  const url = new URL(path, BASE).toString()
  const h = {
    'User-Agent': 'Kela-Seafile-Probe/1.0',
    ...headers,
  }
  if (auth && authHeader) h.Authorization = authHeader
  const res = await fetch(url, {
    method,
    headers: h,
    body,
    redirect: 'manual',
  })
  const text = await res.text().catch(() => '')
  return { url, res, text }
}

const PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:resourcetype/><d:getcontentlength/><d:getlastmodified/><d:displayname/>
  </d:prop>
</d:propfind>`

function show(label, r) {
  console.log(`\n── ${label}`)
  console.log(`   ${r.res.status} ${r.res.statusText}`)
  const interesting = [
    'www-authenticate',
    'dav',
    'allow',
    'ms-author-via',
    'server',
    'content-type',
  ]
  for (const k of interesting) {
    const v = r.res.headers.get(k)
    if (v) console.log(`   ${k}: ${v}`)
  }
  if (r.text && r.text.length < 800) console.log(`   body: ${r.text.trim().slice(0, 400)}`)
  else if (r.text) console.log(`   body: <${r.text.length} bytes>`)
}

console.log(`Seafile WebDAV 探测 @ ${BASE}`)

// 1. 匿名探测：确认端点存在 + 认证方式
try {
  show('匿名 GET /  (期望 401，用于确认认证方式)', await req('GET'))
} catch (e) {
  console.log(`\n── 匿名 GET / 失败: ${e.message}`)
}

// 2. 匿名 PROPFIND：确认是否支持 WebDAV 方法
try {
  show(
    '匿名 PROPFIND / (期望 401 而非 405，说明 WebDAV 已开启)',
    await req('PROPFIND', '', { body: PROPFIND_BODY, headers: { 'Content-Type': 'application/xml' } })
  )
} catch (e) {
  console.log(`\n── 匿名 PROPFIND 失败: ${e.message}`)
}

if (!authHeader) {
  console.log('\n提示：未设置 SEAFILE_USER / SEAFILE_PASS，跳过认证探测。')
  console.log('设置后重跑，可确认凭据是否有效、以及目录是否可读写。')
  console.log('\nPowerShell 示例：')
  console.log('  $env:SEAFILE_USER="你的校园账号"; $env:SEAFILE_PASS="密码"; node scripts/seafile-probe.mjs')
  process.exit(0)
}

// 3. 认证 PROPFIND：读取根目录列表（真实凭据校验）
try {
  const r = await req('PROPFIND', '', {
    auth: true,
    body: PROPFIND_BODY,
    headers: { 'Content-Type': 'application/xml', Depth: '1' },
  })
  show('认证 PROPFIND / (Depth:1)', r)
  if (r.res.status === 207) {
    const names = [...r.text.matchAll(/<d:href>([^<]+)<\/d:href>/g)].map((m) => m[1])
    console.log(`   目录项 ${names.length} 个:`)
    names.slice(0, 20).forEach((n) => console.log(`     ${decodeURIComponent(n)}`))
    console.log('\n✅ 凭据有效，WebDAV 可读。')
  } else if (r.res.status === 401) {
    console.log('\n❌ 401：账号或密码不对（Seafile WebDAV 用的是登录密码，不是单独的 token）。')
  }
} catch (e) {
  console.log(`\n── 认证 PROPFIND 失败: ${e.message}`)
}

// 4. 认证 GET：验证目录是否真的能读到内容
try {
  const r = await req('GET', '', { auth: true })
  console.log(`\n── 认证 GET /  →  ${r.res.status}`)
  if (r.res.status === 200) console.log('   ✅ 带凭据可读。')
} catch (e) {
  console.log(`\n── 认证 GET 失败: ${e.message}`)
}

console.log('\n提示：WebDAV 强制认证，匿名 GET 一律 401。')
console.log('      若要让【未登录的游客】看到图片，需在 Seafile 侧把资料库设为匿名可读，')
console.log('      或给 /seafdav/kela-images/ 开免认证只读例外。见 README-DEV.md 第八节。')
