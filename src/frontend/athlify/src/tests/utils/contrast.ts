export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function compositeOver(color: string, backdrop: string): string {
  const match = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color)
  if (!match) return color
  const alpha = Number(match[4])
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const [br, bg, bb] = hexToRgb(backdrop)
  const mix = (top: number, under: number) => Math.round(top * alpha + under * (1 - alpha))
  const hex = [mix(r, br), mix(g, bg), mix(b, bb)].map((v) => v.toString(16).padStart(2, '0'))
  return `#${hex.join('')}`.toUpperCase()
}

function relativeLuminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected an opaque #RRGGBB color, got "${hex}"`)
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(fg: string, bg: string): number {
  const [light, dark] = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}
