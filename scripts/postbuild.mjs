// GitHub Pages has no server-side routing: a deep link such as /app/people would 404. Pages serves 404.html for any
// unknown path, so a copy of index.html there lets the React router take over (the URL stays as typed).
// The public legal pages also get their own copy, so they answer 200 (not 404): Google checks the privacy and terms links
// given on its OAuth consent screen and may reject a link that returns an error status.
import { copyFileSync, mkdirSync } from 'node:fs'

const dist = (path) => new URL(`../dist/${path}`, import.meta.url)

copyFileSync(dist('index.html'), dist('404.html'))
console.log('Copied dist/index.html to dist/404.html (GitHub Pages SPA fallback)')

for (const page of ['privacy', 'terms']) {
  mkdirSync(dist(page), { recursive: true })
  copyFileSync(dist('index.html'), dist(`${page}/index.html`))
  console.log(`Copied dist/index.html to dist/${page}/index.html (answers 200)`)
}
