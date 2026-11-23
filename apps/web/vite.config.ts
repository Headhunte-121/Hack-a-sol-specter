import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Suraksha',
        short_name: 'Suraksha',
        description: 'Check scam messages, calls and QR codes. Learn payment safety. Works offline.',
        lang: 'hi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f7ff',
        theme_color: '#1747c4',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // model, rule lists, lesson/question packs and fonts are all precached so the offline modules work in airplane mode
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,json,mp3}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], setupFiles: ['./src/test-setup.ts'] },
})