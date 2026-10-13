# 科了（Kela）开发与发版备忘

> 最后更新：2026-08-30。项目：中国科大校友社区（React 19 + Vite + Capacitor 安卓壳 + Supabase 后端）。

## 一、关键地址

| 项 | 值 |
|---|---|
| 项目根目录 | `C:\columa\column----` |
| Supabase 项目 | `https://dplrwzzzdzhasblabyzl.supabase.co` |
| Supabase 控制台 | 上面的 URL 换成 `https://supabase.com/dashboard/project/dplrwzzzdzhasblabyzl` |
| 本机开发地址 | `http://localhost:5173/` |
| 局域网地址（手机调试） | `http://100.65.17.188:5173/`（IP 可能因网络变化，以终端输出为准） |

> ⚠️ 密钥安全：`.env` 里的 `SUPABASE_SERVICE_ROLE_KEY` 是最高权限，**绝不能**提交到 git 或写进任何公开文档。`VITE_SUPABASE_ANON_KEY` 是公开 key，可放心打包进前端。

## 二、本机运行命令备忘

```bash
# 启动开发服务器（HMR 热更新）
npm run dev

# 局域网可访问（手机浏览器/真机调试用）
npm run dev -- --host

# 构建生产版网页（tsc 类型检查 + vite 打包到 dist/）
npm run build

# 把 dist/ 同步进安卓原生工程
npx cap sync android
```

### 安卓构建环境（本机已装好）

| 项 | 路径 |
|---|---|
| JDK 21 | `C:\Users\Admin\.jdks\jbr-21.0.11` |
| Android SDK | `C:\Users\Admin\AppData\Local\Android\Sdk`（android-37.0 + build-tools 36.0.0） |

命令行打 APK（在 PowerShell 里）：

```powershell
$env:JAVA_HOME = "C:\Users\Admin\.jdks\jbr-21.0.11"
$env:ANDROID_HOME = "C:\Users\Admin\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Admin\AppData\Local\Android\Sdk"
cd android
.\gradlew.bat assembleDebug --no-daemon --console=plain
```

产物：`android/app/build/outputs/apk/debug/app-debug-<版本号>.apk`

## 三、版本号机制

版本号在 `android/app/build.gradle`：

```gradle
versionCode 3      // 纯整数，必须每次 +1（Android 判断能否覆盖安装）
versionName "0.0.1" // 显示版本号，语义化
```

| 关系 | 规则 |
|---|---|
| `versionCode` | 只增不减，每版 +1 |
| `versionName` | 0.0.1 → 0.0.2 → …（patch 位递增，自然进位到 0.0.10） |

Apk 产物会自动命名为 `app-debug-<versionName>.apk`（如 `app-debug-0.0.1.apk`）。

## 四、推新版本（发版）命令备忘录

### 前提（一次性）

1. `.env` 里要有 `SUPABASE_SERVICE_ROLE_KEY`（Dashboard → Settings → API → service_role）
2. Supabase 里已建公共桶 `app-releases`（Storage → New bucket → 名字 `app-releases` → 勾选 Public）

### 一键发版（推荐）

```bash
# 自动：versionName patch+1（0.0.1→0.0.2）、versionCode +1 → 构建 → 同步 → 打 APK → 上传
npm run ship

# 带更新说明
npm run ship "修复 xx；新增 yy"

# 手动指定版本名（跳版本时）
npm run ship 0.0.5 "说明"
```

### 只上传当前已打好的 APK（不重新构建、不 bump 版本号）

```bash
npm run release -- android/app/build/outputs/apk/debug/app-debug-0.0.1.apk "说明"
```

发版后：App 内「设置 → App 更新 → 检查更新」+ 网页版页脚下载按钮即刻生效。

## 五、Supabase 数据库（迁移文件）

在 Supabase 控制台 → SQL Editor 执行，全部幂等可重复跑。`schema.sql` 是建库主脚本，`migration_*.sql` 是增量。

| 文件 | 作用 |
|---|---|
| `schema.sql` | 建表 + RLS 策略 + 触发器（全量） |
| `migration_topics.sql` | 热词：发帖 RPC `publish_post_with_topics` + 提及次数视图 |
| `migration_delete_post.sql` | 删帖 24 小时限制（重写 posts_delete 策略） |
| `migration_announcements.sql` | 公告表（停服/更新/公告；网站横幅 + App 弹窗） |
| `migration_likes_comments.sql` | 点赞/评论表 |
| `migration_favorites.sql` | 收藏表 |
| `migration_add_profile_fields.sql` | 资料字段 |
| `migration_enrollment_year.sql` | 入学年份 |
| `migration_profile_type.sql` | 身份类型 |
| `migration_degree_graduation.sql` | 学位/毕业年份 |

> 新环境首次部署：先 `schema.sql`，再依次跑各 `migration_*.sql`。

## 六、发版完整流程（手动版，等价于 npm run ship）

```bash
# 1. 改版本号（可选，或用 ship 自动）
#    android/app/build.gradle: versionCode +1, versionName 更新

# 2. 构建网页 + 同步
npm run build
npx cap sync android

# 3. 打 APK（设 JAVA_HOME/ANDROID_HOME 后）
cd android && .\gradlew.bat assembleDebug

# 4. 上传
npm run release -- android/app/build/outputs/apk/debug/app-debug-<版本号>.apk "说明"
```

## 七、公告发布（停服 / 新版功能 / 通知）

前提：已执行 `migration_announcements.sql` 建表。

```bash
# 停服公告（网站横幅 + App 弹窗）
npm run announce -- "5月1日停服维护" "凌晨2:00-4:00升级数据库，期间无法使用" --category 停服 --banner --popup

# 新版功能（仅 App 弹窗，不占横幅）
npm run announce -- "v0.0.2 已发布" "新增热词排行榜、删帖功能" --category 更新 --popup

# 普通横幅（默认仅网站滚动横幅）
npm run announce -- "欢迎使用科了" "愿你在这里找到同窗" --category 公告
```

参数：

| 参数 | 含义 |
|---|---|
| 第 1 个参数 | 标题（必填） |
| 第 2 个参数 | 正文（可选） |
| `--category 公告\|更新\|停服` | 分类（默认「公告」） |
| `--banner` / `--no-banner` | 网站横幅开/关（默认开） |
| `--popup` | 开启 App 弹窗（默认关） |

发布后**即时生效**：网页刷新即见横幅滚动；App 下次打开弹窗（已读后不再弹）。

下线公告（公告无到期时间，需手动停用）：

```bash
# 下线全部公告
npm run announce -- --off

# 只下线标题或正文含「停服」的公告（关键词模糊匹配）
npm run announce -- --off "停服"
```

> 提示：`--off` 是下线的命令行方式，效果等同于在 SQL Editor 执行 `update public.announcements set active = false;`。SQL 只能在 Supabase 控制台跑，PowerShell 无法识别 `update` 命令。

## 八、校园盘（Seafile）作为图片后端

> 已实现：帖子配图可存入 USTC 校园网盘 `https://pan.ustc.edu.cn/seafdav/`，绕开 Supabase Storage 的容量与流量限制。
> **数据库仍在 Supabase**，只有图片文件走校园盘。

### 为什么不是「整个后端都换成 Seafile」

WebDAV 是**文件协议**，只能按路径读写文件，没有 SQL。帖子流、点赞计数、评论关联、热词聚合、
RLS 行级权限这些都依赖查询、聚合与事务，用「目录 + JSON 文件」硬凑会同时丢掉并发安全和权限隔离。
因此本方案只把**最适合 WebDAV 的部分（二进制大文件）**迁过去，这是收益最大、风险最低的切法。

### 关键限制（务必先读）

| 事实 | 后果 |
|---|---|
| Seafile WebDAV **强制认证**，匿名 GET 一律 401 | 图片 URL 默认**只有登录校园盘的人**能打开 |
| WebDAV 接口**不提供**生成公开分享链接的能力 | 无法用纯 WebDAV 拿到「游客可见」的图片地址 |
| 浏览器不能替你保管**所有人共用**的账号密码 | 若把站长账号塞进前端 = 把校园网密码公开 |

实测（`node scripts/seafile-probe.mjs`）：

```
匿名 GET  /                    → 401  www-authenticate: Basic realm="Seafile Authentication"
匿名 PROPFIND /                → 401  （401 而非 405，说明 WebDAV 已开启）
匿名 GET  /kela-images/...jpg  → 401  （无匿名旁路）
```

所以架构上做了**两层**：

1. **凭据只存本机**（localStorage，键 `keliao.seafile.credentials`）——是**发帖用户自己的**校园盘账号，
   不是站长账号。密码不上传、不写日志、不进 bundle。这是安全红线，不可妥协。
2. **显示层逐级降级**（`src/components/PostImage.tsx`）：公开只读可用就直接加载；
   否则若本机有凭据就带凭据取 blob 显示；再不行就显示明确的「图片打不开」提示，而不是破图。

### 让游客也能看到图（三选一，都是 Seafile 侧一次性操作）

1. 在 Seafile 后台把图片所在资料库设为**公开 / 匿名可读**；
2. 用 nginx 给 `/seafdav/` 下 `/kela-images/` 前缀开一条**免认证只读**例外；
3. 用 rclone 把该资料库同步到一个匿名可读的静态目录。

做完任一项，`PostImage` 的第一级降级就会成功，全体游客可见。

### 以后有了自己的服务器，怎么迁移

**结论：能迁移，而且数据库一行都不用改。** 这是从设计上就保证的。

关键设计：**数据库里存的是相对路径，不是绝对 URL。**

| | 存储的值 | 换服务器时 |
|---|---|---|
| ❌ 反面（已避免） | `https://pan.ustc.edu.cn/seafdav/kela-images/a.jpg` | 全部历史图片指向旧主机 → 必须整库 UPDATE 或全部裂图 |
| ✅ 现在 | `kela-images/a.jpg` | 显示时才拼 base，换 base 自动跟随 |

迁移三步（`src/lib/imageRef.ts` 是这套机制的核心）：

```bash
# 1. 看有哪些图、迁移后 URL 变成什么（不联网，纯预览）
node scripts/storage-migrate.mjs plan --new-base https://cdn.example.com/kela --env-file .env

# 2. 把文件从旧 WebDAV 搬到新 WebDAV（幂等，可重复跑，断点续传靠「已存在则跳过」）
node scripts/storage-migrate.mjs copy \
  --from-url https://pan.ustc.edu.cn/seafdav --from-user 学号 --from-pass 密码 \
  --to-url   https://my-server.com/dav        --to-user user  --to-pass pass

# 3. 前端「设置 → 校园盘 → 迁移到自建服务器」填新地址，或直接改 localStorage
#    配置键：keliao.storage.config（{ backend, customBaseUrl, customUploadUrl }）
```

> 保守做法：先把文件 `copy` 过去，确认新地址能打开图，再切前端配置。
> 旧文件先别删，观察一段时间再清理 —— 迁移期间两边都在，零风险。

**兼容性**：旧数据里若已存在绝对 URL（或 Supabase 直链），`resolveImageUrl()` 会原样返回，
不会被改写，所以新旧数据可以共存，迁移是渐进的。

### 配置方式

App/网站 →「设置 → 校园盘（Seafile）」→ 填地址、账号、密码、目录 → **测试连接** → 保存。

| 字段 | 默认值 |
|---|---|
| WebDAV 地址 | `https://pan.ustc.edu.cn/seafdav/` |
| 图片目录 | `/kela-images` |

> 不配置也完全不影响使用：图片会自动走 Supabase Storage 的 `post-images` 桶（需该 public 桶存在）。
> 校园盘上传失败时也会**自动回落**到 Supabase，发帖功能不会因此瘫痪。

### 命令行自检

```powershell
# 匿名探测端点与认证方式
node scripts/seafile-probe.mjs

# 带凭据验证（确认账号可用 + 目录可读）
$env:SEAFILE_USER="你的学号或邮箱"; $env:SEAFILE_PASS="密码"; node scripts/seafile-probe.mjs
```

### 相关文件

| 文件 | 职责 |
|---|---|
| `src/lib/webdav.ts` | WebDAV 客户端（认证头、中文路径编码、MKCOL 建目录、PUT 上传、错误翻译） |
| `src/lib/imageRef.ts` | **可迁移性核心**：相对路径 ↔ 显示 URL 的解析、存储配置、迁移映射 |
| `src/lib/storage.ts` | 存储层统一入口：选后端、回落逻辑、校验、`displayUrl()` |
| `src/components/SeafileSection.tsx` | 设置界面（含「测试连接」与「迁移到自建服务器」） |
| `src/components/PostImage.tsx` | 图片显示与三级降级 |
| `scripts/storage-migrate.mjs` | 迁移工具：`list` / `plan` / `copy` |
| `scripts/seafile-probe.mjs` | 连通性自检 |

## 九、常见问题

- **gradlew 报 `exit code 1` 但显示 `BUILD SUCCESSFUL`**：那是 PowerShell 把 Gradle 的 stderr 警告（SDK XML 版本提示、flatDir 警告）当错误，实际构建成功，看 `BUILD SUCCESSFUL` 即可。
- **发帖报「RPC 不存在」**：`migration_topics.sql` 没执行；前端有降级（能发帖但无热词关联），执行 SQL 后热词生效。
- **删帖按钮不显示**：只有「本人 + 发布 24 小时内」才显示；且需已执行 `migration_delete_post.sql`。
- **版本冲突装不上**：`versionCode` 没递增，或跨了签名（debug 包与正式签名包不互通，首次换签名需卸载重装）。
- **配图只有自己能看见**：Seafile 资料库没开匿名只读，见第八节「让游客也能看到图」。
- **配图上传报 401**：「设置 → 校园盘」里的账号密码不对（用的是校园盘**登录密码**，不是单独的应用密码）。
- **`npm run build` 报 `UNLOADABLE_DEPENDENCY` / `spawn EPERM`**：本机 Tailwind 原生模块加载失败，与业务代码无关；
  重装依赖即可：`npm i`（若在受限沙箱中运行，需放宽权限）。
