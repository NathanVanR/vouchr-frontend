// Generates the PWA icons (public/icon-192.png, icon-512.png): a white "V" on the Vouchr green.
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

// distance from point p to segment a-b
function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  const half = 0.07 // half the stroke width, relative to the icon size
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size
      const ny = (y + 0.5) / size
      // The V stays inside the middle 60% so a maskable icon can be cropped to a circle safely.
      const d = Math.min(
        segmentDistance(nx, ny, 0.3, 0.3, 0.5, 0.7),
        segmentDistance(nx, ny, 0.7, 0.3, 0.5, 0.7),
      )
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
