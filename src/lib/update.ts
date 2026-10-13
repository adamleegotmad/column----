import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

/**
 * App 更新层：
 * - 版本说明 version.json 与 APK 托管在 Supabase Storage 的公共桶 app-releases；
 * - App 内「检查更新」比对 versionCode，更新时调系统浏览器下载；
 * - 浏览器（网页版）不展示更新入口，只提供 APK 下载链接（见 Footer）。
 *
 * 发版：npm run release（见 scripts/release.mjs），会同时上传 APK 与 version.json。
 */

export const RELEASE_BUCKET = 'app-releases'
const APK_FILE = 'app-release.apk'
const VERSION_FILE = 'version.json'

export interface RemoteVersion {
  versionName: string
  versionCode: number
  apkUrl: string
  notes?: string
  publishedAt?: string
}

export interface LocalVersion {
  versionName: string
  versionCode: number
}

export type UpdateCheckResult =
  | { status: 'latest'; current: LocalVersion; latest: RemoteVersion }
  | { status: 'update'; current: LocalVersion; latest: RemoteVersion }

/** 是否运行在原生壳（Capacitor App）内；浏览器中为 false。 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** 本地版本号：即 android/app/build.gradle 里的 versionName / versionCode。 */
export async function getLocalVersion(): Promise<LocalVersion> {
  const info = await App.getInfo()
  return {
    versionName: info.version,
    versionCode: parseInt(info.build, 10) || 0,
  }
}

/** APK 的公共下载地址（网页版页脚下载按钮用）。 */
export function getApkDownloadUrl(): string {
  return supabase.storage.from(RELEASE_BUCKET).getPublicUrl(APK_FILE).data.publicUrl
}

/** 拉取远端版本说明；失败（桶未建 / 文件未传 / 网络）时抛错。 */
export async function fetchRemoteVersion(): Promise<RemoteVersion> {
  const url = supabase.storage.from(RELEASE_BUCKET).getPublicUrl(VERSION_FILE).data.publicUrl
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const notFound = res.status === 400 || res.status === 404
    throw new Error(
      notFound
        ? '未找到版本信息。请确认已在 Supabase 创建公共桶 app-releases 并上传 version.json（可先运行 npm run release）'
        : `获取版本信息失败（HTTP ${res.status}）`
    )
  }
  const data = (await res.json()) as RemoteVersion
  if (!Number.isInteger(data.versionCode) || !data.apkUrl || !data.versionName) {
    throw new Error('version.json 格式不正确（需含 versionName / versionCode / apkUrl）')
  }
  return data
}

/** 比对本地与远端版本；远端 versionCode 更大才算有更新。 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const current = await getLocalVersion()
  const latest = await fetchRemoteVersion()
  return latest.versionCode > current.versionCode
    ? { status: 'update', current, latest }
    : { status: 'latest', current, latest }
}

/** 用系统浏览器打开下载链接（用户在浏览器中完成下载与安装）。 */
export async function openDownload(url: string): Promise<void> {
  await Browser.open({ url })
}
