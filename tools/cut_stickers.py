"""Вырезает стикеры с белой кромкой из ровного серого фона и делит лист на части.
python3 tools/cut_stickers.py <sheet.png> <cols> <rows> <out_prefix> [name1,name2,...]"""
import sys
from collections import deque
from PIL import Image
src, cols, rows, prefix = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
names = sys.argv[5].split(',') if len(sys.argv) > 5 else [str(i + 1) for i in range(cols * rows)]
im = Image.open(src).convert('RGB'); W, H = im.size; px = im.load()
def is_bg(p):  # серый фон: почти без цвета и не белый
    r, g, b = p; return max(p) - min(p) < 28 and 70 < (r + g + b) / 3 < 212
bg = bytearray(W * H); q = deque()
for x in range(W):
    for y in (0, H - 1): q.append((x, y))
for y in range(H):
    for x in (0, W - 1): q.append((x, y))
while q:  # заливка от краёв только по фону — кромка стикера её останавливает
    x, y = q.popleft(); i = y * W + x
    if bg[i] or not is_bg(px[x, y]): continue
    bg[i] = 1
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and not bg[ny * W + nx]: q.append((nx, ny))
out = Image.new('RGBA', (W, H)); op = out.load()
for y in range(H):
    for x in range(W):
        i = y * W + x
        if bg[i]: op[x, y] = (0, 0, 0, 0); continue
        r, g, b = px[x, y]
        edge = any(0 <= x + dx < W and 0 <= y + dy < H and bg[(y + dy) * W + x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if edge:  # полупрозрачный край: смесь серого и белого → белый с частичной альфой
            a = max(0, min(255, round(((r + g + b) / 3 - 150) / (255 - 150) * 255)))
            op[x, y] = (255, 255, 255, a)
        else: op[x, y] = (r, g, b, 255)
cw, ch = W // cols, H // rows
for k in range(cols * rows):
    c, r = k % cols, k // rows if cols == rows else k // cols
    part = out.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)); bb = part.getbbox()
    if not bb: continue
    part = part.crop(bb); path = f'{prefix}{names[k]}.png'; part.save(path); print(path, part.size)
