import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Vouchr',
        short_name: 'Vouchr',
        description: 'Dignity through choice: coordinate help, consent and partners for your organisation.',
        theme_color: '#0e7a5a',
        background_color: '#f0f6f2',
        display: 'standalone',
        start_url: '/app/projects',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only the app itself is cached. API and Supabase calls always go to the network.
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts' },
          },
        ],
      },
    }),
  ],
  // The backend CORS list and the GoTrue redirect allow-list only know localhost:5500.
  server: { port: 5500, strictPort: true },
  preview: { port: 5500, strictPort: true },
})
