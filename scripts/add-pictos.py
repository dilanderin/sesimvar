#!/usr/bin/env python3
"""Add generated pictograms to the app.

Usage: python3 scripts/add-pictos.py map.tsv
Each line of map.tsv is "<stem>\t<path to generated image on white>".
Writes public/pictos/v2/<stem>.png: white background removed (flood fill from
the borders, feathered edge), trimmed to a square, 256x256, 128 colours.
Needs Pillow and numpy.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'pictos', 'v2')


def keyout(src, size=256, tol=26):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    dist = 255 * 3 - a.sum(axis=2)  # 0 = pure white
    bg = np.zeros((h, w), bool)
    q = deque([(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)])
    while q:
        y, x = q.popleft()
        if bg[y, x] or dist[y, x] > tol:
            continue
        bg[y, x] = True
        if y > 0: q.append((y - 1, x))
        if y < h - 1: q.append((y + 1, x))
        if x > 0: q.append((y, x - 1))
        if x < w - 1: q.append((y, x + 1))
    alpha = Image.fromarray(np.where(bg, 0, 255).astype('uint8'))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        out = out.crop(bbox)
        side = max(out.size)
        pad = int(side * 0.04)
        side += 2 * pad
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(out, ((side - out.size[0]) // 2, (side - out.size[1]) // 2), out)
        out = sq
    return out.resize((size, size), Image.LANCZOS)


def main(map_path):
    os.makedirs(OUT, exist_ok=True)
    rows = [l.split('\t') for l in open(map_path, encoding='utf-8').read().splitlines() if l.strip()]
    for stem, src in rows:
        img = keyout(src.strip())
        img.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(
            os.path.join(OUT, f'{stem}.png'), optimize=True)
        print('added', stem)


if __name__ == '__main__':
    main(sys.argv[1])
