// Сборка мини-приложения.
//   node build.mjs           → docs/ (index.html + app.js + app.css + спрайты и шрифты отдельными файлами) — для GitHub Pages
//   node build.mjs --single  → single/trainer-kawaii.html (всё внутри одного файла) — для предпросмотра
//   node build.mjs --serve   → локальный сервер с пересборкой, http://localhost:5174
// Компоненты берутся из исходников Cozy UI Kit (по умолчанию ../cozy-ui-kit, можно переопределить через KIT=путь).
import { build, context } from 'esbuild';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const single = process.argv.includes('--single');
const serve = process.argv.includes('--serve');
const KIT = resolve(process.env.KIT || '../cozy-ui-kit');
const outdir = single ? 'single/.tmp' : 'docs';

const options = {
  entryPoints: { app: 'src/main.tsx' },
  bundle: true,
  format: 'iife',
  outdir,
  jsx: 'automatic',
  minify: !serve,
  target: ['es2020', 'safari15'],
  legalComments: 'none',
  assetNames: 'assets/[name]-[hash]',
  loader: single ? { '.png': 'dataurl', '.woff2': 'dataurl' } : { '.png': 'file', '.woff2': 'file' },
  alias: {
    'cozy-ui-kit': `${KIT}/src/index.ts`,
    'cozy-ui-kit-css': `${KIT}/src/styles.css`,
    'cozy-ui-kit-fonts': `${KIT}/fonts/fonts.css`,
    'cozy-ui-kit-assets': `${KIT}/src/assets.ts`,
    'cozy-motion': `${KIT}/motion/cozy-motion.ts`,
    'cozy-motion-spec': `${KIT}/motion/motion.json`,
    // один React на всё приложение, даже когда исходники кита лежат рядом со своими node_modules
    react: resolve('node_modules/react'),
    'react-dom': resolve('node_modules/react-dom'),
  },
  define: { 'process.env.NODE_ENV': serve ? '"development"' : '"production"' },
};

const page = (css, js) => readFileSync('src/index.html', 'utf8')
  .replace('<!--CSS-->', () => css) // функция, чтобы «$&» и «$'» внутри кода не считались шаблонами замены
  .replace('<!--JS-->', () => js);

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

if (serve) {
  writeFileSync(`${outdir}/index.html`, page('<link rel="stylesheet" href="app.css">', '<script src="app.js"></script>'));
  const ctx = await context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: outdir, port: 5174 });
  console.log(`http://localhost:${port}`);
} else {
  await build(options);
  if (single) {
    const css = readFileSync(`${outdir}/app.css`, 'utf8');
    const js = readFileSync(`${outdir}/app.js`, 'utf8').replace(/<\/script/gi, '<\\/script');
    mkdirSync('single', { recursive: true });
    writeFileSync('single/trainer-kawaii.html', page(`<style>${css}</style>`, `<script>${js}</script>`));
    rmSync(outdir, { recursive: true, force: true });
    console.log('built single/trainer-kawaii.html');
  } else {
    writeFileSync(`${outdir}/index.html`, page('<link rel="stylesheet" href="app.css">', '<script src="app.js"></script>'));
    writeFileSync(`${outdir}/.nojekyll`, '');
    // только используемые спрайты + сжатие PNG (список: tools/used-assets.txt, собирается обходом всех экранов)
    if (existsSync('tools/used-assets.txt')) execSync('python3 tools/optimize_assets.py docs/assets tools/used-assets.txt', { stdio: 'inherit' });
    console.log('built docs/');
  }
}
