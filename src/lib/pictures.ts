/** Picture sources for new words: ARASAAC pictograms (CC BY-NC-SA, Sergio
 *  Palao / Gobierno de Aragón) and the family's own photos. */

export interface ArasaacResult {
  id: number;
  url: string;
}

export function arasaacImageUrl(id: number, size: 300 | 500 = 300) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_${size}.png`;
}

export async function searchArasaac(query: string, signal?: AbortSignal): Promise<ArasaacResult[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(`https://api.arasaac.org/v1/pictograms/tr/search/${encodeURIComponent(q.toLocaleLowerCase('tr-TR'))}`, { signal });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`ARASAAC ${res.status}`);
  const data = (await res.json()) as { _id: number }[];
  return data.slice(0, 6).map((d) => ({ id: d._id, url: arasaacImageUrl(d._id) }));
}

export async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

/** Square-crop and shrink a photo so it stays small on the device. */
export async function prepareImage(file: Blob, size = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.86),
  );
}
