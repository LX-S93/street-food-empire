"""Turn raw ComfyUI renders into game-ready WebP assets.

Usage: python3 process.py <raw_dir> <out_dir>
raw_dir contains <cat>/<name>_00001_.png as written by ComfyUI.
"""
import sys, os, glob
from collections import deque
from PIL import Image, ImageFilter

RAW, OUT = sys.argv[1], sys.argv[2]
# category -> (mode, size). mode: cut = remove white background and trim; full = keep frame
SPEC = {
    'ic': ('cut', 112), 'tier': ('cut', 520), 'dish': ('cut', 288), 'mach': ('cut', 288),
    'ev': ('cut', 288), 'st': ('cut', 224), 'guest': ('cut', 300),
    'por': ('full', 224), 'bg/street': ('full', 1000), 'bg/map': ('full', 820),
}

def cut_white(im, tol=38):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    def near_white(p):
        r, g, b, a = p
        return r > 255 - tol and g > 255 - tol and b > 255 - tol
    mask = Image.new('L', (w, h), 255)
    mp = mask.load()
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not near_white(px[x, y]):
            continue
        mp[x, y] = 0
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    # soften the edge a little
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(mask)
    bbox = mask.point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        pad = 6
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        im = im.crop(bbox)
    return im

def fit(im, size):
    w, h = im.size
    s = size / max(w, h)
    return im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)

n = 0
for path in sorted(glob.glob(os.path.join(RAW, '**', '*.png'), recursive=True)):
    rel = os.path.relpath(path, RAW).replace('\\', '/')
    cat = rel.split('/')[0]
    name = os.path.basename(path).rsplit('_', 2)[0]
    key = cat + '/' + name if cat == 'bg' else cat
    mode, size = SPEC.get(key, SPEC.get(cat, ('cut', 256)))
    im = Image.open(path)
    im = cut_white(im) if mode == 'cut' else im.convert('RGB')
    im = fit(im, size)
    dst = os.path.join(OUT, cat, name + '.webp')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'WEBP', quality=84, method=6)
    n += 1
print('processed', n)
