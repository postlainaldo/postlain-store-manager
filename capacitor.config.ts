import type { CapacitorConfig } from '@capacitor/cli';

// Production URL — app luôn load từ server, không cần rebuild APK khi update code
const PRODUCTION_URL = 'https://postlain-store-manager.vercel.app';

// Để test local: thay PRODUCTION_URL bằng IP máy dev, ví dụ 'http://192.168.1.10:3000'

const config: CapacitorConfig = {
  appId: 'com.postlain.store',
  appName: 'Postlain Store',
  webDir: 'out',

  // ── Live Server (quan trọng) ──────────────────────────────────────────────
  // App load toàn bộ UI + API từ server → update web là app tự cập nhật
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
  },

  android: {
    // Cho phép HTTP trong LAN khi dev
    allowMixedContent: true,
    backgroundColor: '#f0f9ff',
  },

  ios: {
    backgroundColor: '#f0f9ff',
    contentInset: 'automatic',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0c1a2e',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
