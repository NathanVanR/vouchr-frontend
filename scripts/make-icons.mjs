// Generates the PWA icons (public/icon-192.png, icon-512.png): the handwritten white "v" on the Vouchr green.
// The stroke is the same path as public/favicon.svg. The PNG is a full-bleed green square (the phone rounds or
// crops it), with the v inside the middle 60% so a maskable icon can be cropped to a circle safely.
// Run once with `node scripts/make-icons.mjs`; the PNGs are committed, so this is not part of the build.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const GREEN = [14, 122, 90]
const WHITE = [255, 255, 255]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}

// The "v" as cubic Béziers on a 64-unit grid (same as favicon.svg): [x0,y0, x1,y1, x2,y2, x3,y3]
const V = [
  [17, 22, 21, 22, 23, 26, 25, 34],
  [25, 34, 26, 40, 29, 43, 33, 40],
  [33, 40, 38, 36, 42, 29, 46, 24],
  [46, 24, 48, 22, 50, 24, 48, 26],
]
const STROKE = 4.5 // in the same 64-unit grid

// flatten the curve into short segments, in 0..1 coordinates
const SEGMENTS = []
let prev = null
for (const [x0, y0, x1, y1, x2, y2, x3, y3] of V) {
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const u = 1 - t
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
    const p = [x / 64, y / 64]
    if (prev && (p[0] !== prev[0] || p[1] !== prev[1])) SEGMENTS.push([...prev, ...p])
    prev = p
  }
}

// distance from point p to segment a-b
function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  const half = STROKE / 2 / 64 // half the stroke width, relative to the icon size
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size
      const ny = (y + 0.5) / size
      let d = Infinity
      for (const [ax, ay, bx, by] of SEGMENTS) d = Math.min(d, segmentDistance(nx, ny, ax, ay, bx, by))
      const cover = Math.max(0, Math.min(1, (half - d) * size + 0.5))
      const o = y * (size * 3 + 1) + 1 + x * 3
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(GREEN[c] + (WHITE[c] - GREEN[c]) * cover)
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), png(size))
console.log('Wrote public/icon-192.png and public/icon-512.png')
