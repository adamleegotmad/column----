import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.columa.keliao',
  appName: '科了',
  webDir: 'dist',
  // 现代 Android WebView 均支持，保持默认 24 即可；如需更老的机型可自行调低
  android: {
    minSdkVersion: 24,
  },
};

export default config;
