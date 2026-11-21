/** Small colour helpers. The design derives every category tint by mixing the
 *  category's base colour into the surface it sits on (white by day, the dark
 *  card colour by night) at fixed strengths. */

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Mix `color` into `ground`; `amount` 0 → ground, 1 → color. */
export function mix(color: string, ground: string, amount: number): string {
  const a = parse(color);
  const b = parse(ground);
  return toHex(a.map((v, i) => b[i] + (v - b[i]) * amount));
}

export function rgba(color: string, alpha: number): string {
  const [r, g, b] = parse(color);
  return `rgba(${r},${g},${b},${alpha})`;
}
