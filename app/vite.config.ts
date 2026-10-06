import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/"
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Dino English',
        short_name: 'Dino English',
        description: 'English words game for kids',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#fff8e1',
        theme_color: '#ff9800',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'images/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'images/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // precache EVERYTHING so the app works fully offline after first load
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,mp3,json,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
})
