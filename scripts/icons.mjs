// Renders the PWA icons from an inline SVG mark (gold diamond on dark).
import sharp from 'sharp'

const mark = (size, pad) => {
  const c = size / 2, r = size / 2 - pad, ri = r * 0.44
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#101014"/>
  <path d="M${c} ${c - r} L${c + r} ${c} L${c} ${c + r} L${c - r} ${c} Z" fill="none" stroke="#BA8C3C" stroke-width="${size * 0.043}"/>
  <path d="M${c} ${c - ri} L${c + ri} ${c} L${c} ${c + ri} L${c - ri} ${c} Z" fill="#BA8C3C"/></svg>`
}

const out = [
  ['public/icon-192.png', 192, 192 * 0.19],
  ['public/icon-512.png', 512, 512 * 0.19],
  ['public/icon-512-maskable.png', 512, 512 * 0.27],
  ['public/apple-touch-icon.png', 180, 180 * 0.19],
]
for (const [file, size, pad] of out) {
  await sharp(Buffer.from(mark(size, pad))).png().toFile(file)
  console.log('wrote', file)
}
