# Vouchr frontend (React)

The staff app for Vouchr, built with React and Vite and live at https://vouchr.natevr.net. (The earlier plain HTML/JS site is only in git history.)
Phone-first design with a desktop layout (sidebar, two-pane lists) from 900px up. Installable as a PWA.

## Run it

```
npm install
npm run dev        # http://localhost:5500 (the backend CORS list and GoTrue allow-list only know port 5500)
npm run lint
npm run build      # production build into dist/ (also writes dist/404.html for GitHub Pages)
npm run preview    # serve dist/ locally
```

The API and the local Supabase Auth (GoTrue) must be running for real data: see the root `CLAUDE.md`
(`docker compose up -d`, then the backend with the `local` profile). Without them, open `/demo` for sample data.

## Layout

```
src/
  config.js            API + Supabase settings, chosen by hostname (localhost vs production)
  router.jsx           routes; every page is lazy-loaded
  lib/                 api.js (all API calls), demo-data.js (the demo backend), validation.js, labels.js, format.js
  auth/                AuthProvider (Supabase session + /api/users/me + active organisation), RequireAuth
  hooks/               TanStack Query hooks per area, useApiMutation (write + refresh lists + toast)
  components/          AppShell, PageHero, Sheet (bottom sheet / modal), MemberPicker, SignaturePad, ...
  dialogs/, toast/     confirm()/prompt() replacements and toasts
  pages/               projects/, people/, families/, partners/, care/, admin/, plus Landing, Login, Register...
  styles/              tokens.css (colours, radii), base.css, shell.css, pages.css
```

## Notes

- Auth uses `@supabase/auth-js` directly (only Auth is used), not the full `supabase-js`, which keeps the bundle small.
  The storage key matches supabase-js, so people signed in on the old site stay signed in.
- Demo mode (`/demo`) answers every API call from `lib/demo-data.js` and keeps its state in `sessionStorage`.
- Deploy: pushing to `master` runs `.github/workflows/deploy.yml`, which lints, builds and publishes to GitHub Pages (Settings > Pages > Source: GitHub Actions).
  `public/CNAME` keeps the `vouchr.natevr.net` domain.
- Layout: `.page-body` is pulled up over the green `PageHero` on phones, so a page's first element must be a card, or go inside the hero as `PageHero` children (the Projects filter chips do).
- `node scripts/make-icons.mjs` regenerates the PWA icons.
