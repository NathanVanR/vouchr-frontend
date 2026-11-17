// Picks the API and Supabase settings by hostname, same values as the old js/config.js.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)

// STAGING build (Cloudflare Pages env var VITE_STAGING=true): a separate API and database with made-up data, and a
// "log in as a test user" screen instead of Supabase. The flag is baked in at build time, so a production build
// (no flag) can never behave like staging.
export const isStaging = import.meta.env.VITE_STAGING === 'true'
const stagingApi = import.meta.env.VITE_API_BASE_URL || ''

export const config = isStaging
  ? {
      // the auth client needs some URL; staging never calls it (see lib/stagingLogin.js)
      supabase: { url: stagingApi || 'https://staging.invalid', anonKey: 'staging' },
      apiBaseUrl: stagingApi,
    }
  : isLocal
  ? {
      // Local: Vite dev server + local Supabase (GoTrue) + local API
      supabase: {
        url: 'http://localhost:9999',
        anonKey:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      },
      apiBaseUrl: 'http://localhost:8081',
    }
  : {
      // Production (GitHub Pages + hosted Supabase + Cloud Run)
      supabase: {
        url: 'https://mnvbheibfcycytqneajg.supabase.co',
        anonKey: 'sb_publishable_6FT-_h9i12tFZspt1Hzb4Q_5yyd1D_4',
      },
      apiBaseUrl: 'https://vouchr-backend-39348059822.africa-south1.run.app',
    }
