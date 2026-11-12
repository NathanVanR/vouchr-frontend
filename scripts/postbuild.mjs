// GitHub Pages has no server-side routing: a deep link such as /app/people would 404. Pages serves 404.html for any
// unknown path, so a copy of index.html there lets the React router take over (the URL stays as typed).
import { copyFileSync } from 'node:fs'

copyFileSync(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url))
console.log('Copied dist/index.html to dist/404.html (GitHub Pages SPA fallback)')
