import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'in.gov.cg.suraksha',
  appName: 'Suraksha',
  webDir: 'dist',
  server: {
    // Serves dist/ over https://localhost so window.isSecureContext is true
    // (required for live camera/mic) and /model/*.json loads offline.
    androidScheme: 'https',
  },
}

export default config
