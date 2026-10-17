"""Генерация картинки через Polza.ai. Ключ читается из файла и никуда не печатается.
python3 tools/polza_gen.py <key_file> <ref1,ref2,...> <out.png> <aspect> <prompt_file> [model]
По умолчанию google/gemini-nano-banana-2.1 в 1K (3 ₽): лучше всех держит сходство с фото-референсами."""
import base64, io, json, sys, time, urllib.request
from PIL import Image
key_file, refs, out, aspect, prompt_file = sys.argv[1:6]
model = sys.argv[6] if len(sys.argv) > 6 else 'google/gemini-nano-banana-2.1'
H = {'Authorization': 'Bearer ' + open(key_file).read().strip(), 'Content-Type': 'application/json'}
def req(method, url, body=None):
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers=H, method=method)
    with urllib.request.urlopen(r, timeout=180) as f: return json.load(f)
def b64(path):  # референсы ужимаем до 1024px — модели больше не нужно, а запрос легче
    im = Image.open(path).convert('RGB'); im.thumbnail((1024, 1024))
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=90)
    return {'type': 'base64', 'data': 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()}
inp = {'prompt': open(prompt_file, encoding='utf8').read(), 'aspect_ratio': aspect, 'image_resolution': '1K', 'output_format': 'png',
       'images': [b64(r) for r in refs.split(',') if r]}
r = req('POST', 'https://polza.ai/api/v1/media', {'model': model, 'input': inp, 'async': True, 'provider': {'max_price': {'image': 3.5}}})
gid = r.get('id'); print('id', gid, r.get('status'))
for _ in range(120):
    if r.get('status') in ('completed', 'failed', 'cancelled'): break
    time.sleep(4); r = req('GET', f'https://polza.ai/api/v1/media/{gid}')
print('status', r.get('status'), 'cost_rub', (r.get('usage') or {}).get('cost_rub'), 'error', r.get('error'))
urls = []
def find(o):
    if isinstance(o, str) and o.startswith('http'): urls.append(o)
    elif isinstance(o, dict): [find(v) for v in o.values()]
    elif isinstance(o, list): [find(v) for v in o]
find(r.get('data')); find(r.get('content'))
if not urls: print(json.dumps({k: v for k, v in r.items() if k != 'input'}, ensure_ascii=False)[:1500])
else: urllib.request.urlretrieve(urls[0], out); print('saved', out)
