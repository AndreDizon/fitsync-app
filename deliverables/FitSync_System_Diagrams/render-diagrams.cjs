// Run from the repository root. Tool packages are isolated from app dependencies.
const fs = require('fs');
const path = require('path');
const { instance } = require(path.join(process.env.TEMP, 'fitsync-diagram-tools/node_modules/@viz-js/viz/dist/viz.cjs'));
const { chromium } = require(path.join(process.env.TEMP, 'fitsync-layout-check/node_modules/playwright'));
const sharp = require('sharp');
const folder = __dirname;

(async () => {
  const viz = await instance();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const base of ['Figure_4_5_Context', 'Figure_4_6_Use_Case', 'Figure_4_7_DFD_Level_0']) {
      const svg = viz.renderString(fs.readFileSync(path.join(folder, base + '.dot'), 'utf8'), { format: 'svg', engine: 'dot' });
      fs.writeFileSync(path.join(folder, base + '.svg'), svg);
      const [, width, height] = svg.match(/viewBox="0\.00 0\.00 ([\d.]+) ([\d.]+)"/) || [];
      if (!width || !height) throw Error('Missing SVG dimensions: ' + base);
      const page = await browser.newPage({ viewport: { width: Math.ceil(Number(width)), height: Math.ceil(Number(height)) }, deviceScaleFactor: 1.5 });
      await page.setContent('<style>body{margin:0;background:white}svg{display:block;width:100%;height:auto}@page{margin:0}</style>' + svg.replace(/<\?xml[^>]+\?>/, '').replace(/<!DOCTYPE[\s\S]*?>/, ''));
      await page.locator('svg').screenshot({ path: path.join(folder, base + '.png') });
      await page.pdf({ path: path.join(folder, base + '.pdf'), width: Math.ceil(Number(width)) + 'px', height: Math.ceil(Number(height)) + 'px', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
      await sharp(path.join(folder, base + '.png')).resize({ width: 1600 }).toFile(path.join(process.cwd(), 'logs', base + '_preview.png'));
      console.log(base + ': ' + Math.ceil(Number(width)) + ' × ' + Math.ceil(Number(height)) + ' vector units');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
