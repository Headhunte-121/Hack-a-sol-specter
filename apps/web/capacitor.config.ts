import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hackasol.suraksha',
  appName: 'Suraksha',
  webDir: 'dist',
  android: {
    adjustMarginsForEdgeToEdge: 'force',
  },
  server: {
    // Serves dist/ over https://localhost so window.isSecureContext is true
    // (required for live camera/mic) and /model/*.json loads offline.
    androidScheme: 'https',
  },
}

export default config
