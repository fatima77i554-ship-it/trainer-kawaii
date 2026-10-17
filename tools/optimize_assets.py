"""Готовит docs/assets к публикации: оставляет только используемые файлы (tools/used-assets.txt)
и сжимает PNG в палитру на 256 цветов — как pngquant, но на PIL. Сжатый файл берётся, только если он
меньше и почти не отличается от исходного (RMS ошибки ≤ 3 из 255 по каждому каналу, включая прозрачность).
python3 tools/optimize_assets.py <assets_dir> <used_list>"""
import os, re, sys
from PIL import Image, ImageChops, ImageStat

assets, used_list = sys.argv[1], sys.argv[2]
keep = {l.strip() for l in open(used_list, encoding='utf8') if l.strip() and not l.startswith('#')}
removed = packed = 0
before = after = 0
for f in sorted(os.listdir(assets)):
    path = os.path.join(assets, f)
    base = re.sub(r'-[A-Z0-9]{8}(\.\w+)$', r'\1', f)  # esbuild добавляет хэш: name-ABCD1234.png
    if f.endswith('.woff2'):
        continue  # шрифты делятся по unicode-range, браузер сам берёт нужные — оставляем все
    if base not in keep:
        os.remove(path); removed += 1; continue
    if not f.endswith('.png'):
        continue
    size = os.path.getsize(path); before += size
    im = Image.open(path).convert('RGBA')
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
    rms = ImageStat.Stat(ImageChops.difference(im, q.convert('RGBA'))).rms
    tmp = path + '.tmp.png'
    q.save(tmp, optimize=True)
    if os.path.getsize(tmp) < size and max(rms) <= 3:
        os.replace(tmp, path); packed += 1
    else:
        os.remove(tmp)
    after += os.path.getsize(path)
print(f'assets: removed {removed} unused, packed {packed} PNG, PNG {before // 1024} KB -> {after // 1024} KB')
