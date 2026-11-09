#!/usr/bin/env node
// Capture showcase media (screenshots, GIF + WebM clips, manifest.json) for a web app with Playwright.
// Usage: node capture.mjs --config docs/media/capture.config.mjs [--url URL] [--serve] [--out DIR]
//        [--only id,id] [--no-shots] [--no-clips] [--headed]
//        node capture.mjs --setup      (install the pinned tool dependencies only)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  normalizeConfig, shotFile, clipFiles, clipWidths, selectGifFrames, constantRateFrames,
  staleFiles, mergeItems, downscaleRgba, parseArgs,
} from './capture-lib.mjs';

const TOOL = 'project-showcase/capture.mjs';
const DEPS = { playwright: '1.59.1', gifenc: '1.0.3', 'jpeg-js': '0.4.4' };
const BASE_CSS = `
  html { scrollbar-width: none; }
  ::-webkit-scrollbar { display: none; }
  *, *::before, *::after { caret-color: transparent !important; }
`;
const CURSOR_SCRIPT = `(() => {
  const install = () => {
    if (document.getElementById('__showcase_cursor')) return;
    const dot = document.createElement('div');
    dot.id = '__showcase_cursor';
    dot.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;' +
      'background:rgba(20,20,20,.35);border:2px solid rgba(255,255,255,.9);box-shadow:0 1px 4px rgba(0,0,0,.4);' +
      'pointer-events:none;z-index:2147483647;transition:transform .12s ease-out;opacity:0';
    document.documentElement.appendChild(dot);
    const pos = { x: 0, y: 0, s: 1 };
    const paint = () => { dot.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px) scale(' + pos.s + ')'; };
    addEventListener('mousemove', (e) => { pos.x = e.clientX; pos.y = e.clientY; dot.style.opacity = '1'; paint(); }, true);
    addEventListener('mousedown', () => { pos.s = 0.7; paint(); }, true);
    addEventListener('mouseup', () => { pos.s = 1; paint(); }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install();
})();`;

function depsDir() {
  return process.env.SHOWCASE_DEPS || path.join(os.homedir(), '.cache', 'project-showcase');
}

function run(command, args, options = {}) {
  // Windows needs a shell for npm.cmd; pass one joined string so Node does not warn about unescaped args.
  const result = process.platform === 'win32' && options.shell !== false
    ? spawnSync([command, ...args].join(' '), { stdio: 'inherit', shell: true, ...options })
    : spawnSync(command, args, { stdio: 'inherit', ...options, shell: false });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status})`);
}

/** Install pinned dependencies into a private tool folder, so target projects stay untouched. */
function ensureDeps() {
  const dir = depsDir();
  const manifest = path.join(dir, 'package.json');
  const wanted = JSON.stringify({ name: 'project-showcase-deps', private: true, dependencies: DEPS }, null, 2);
  const current = fs.existsSync(manifest) ? fs.readFileSync(manifest, 'utf8') : '';
  const installed = Object.keys(DEPS).every((name) => fs.existsSync(path.join(dir, 'node_modules', name, 'package.json')));
  if (current !== wanted || !installed) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(manifest, wanted);
    console.log(`Installing capture dependencies into ${dir} ...`);
    run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: dir });
  }
  const marker = path.join(dir, `.browsers-${DEPS.playwright}`);
  if (!fs.existsSync(marker)) {
    run(process.execPath, [path.join(dir, 'node_modules', 'playwright', 'cli.js'), 'install', 'chromium', 'ffmpeg'], { cwd: dir, shell: false });
    fs.writeFileSync(marker, new Date().toISOString());
  }
  const require = createRequire(manifest);
  return { playwright: require('playwright'), gifenc: require('gifenc'), jpeg: require('jpeg-js') };
}

/** Playwright's bundled ffmpeg (VP9/WebM capable) or one from SHOWCASE_FFMPEG / PATH. */
function findFfmpeg() {
  if (process.env.SHOWCASE_FFMPEG) return process.env.SHOWCASE_FFMPEG;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.platform === 'win32' && path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),
    process.platform === 'darwin' && path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright')].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter((d) => d.startsWith('ffmpeg-')).sort().reverse();
    for (const d of dirs) {
      const exe = fs.readdirSync(path.join(root, d)).find((f) => /^ffmpeg/.test(f));
      if (exe) return path.join(root, d, exe);
    }
  }
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  return probe.status === 0 ? 'ffmpeg' : null;
}

function git(cwd, args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

async function startServer(serve, cwd) {
  console.log(`Starting: ${serve.command}`);
  const child = spawn(serve.command, { cwd, shell: true, stdio: 'ignore', detached: process.platform !== 'win32' });
  const stop = () => {
    if (child.exitCode !== null) return;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
  };
  const deadline = Date.now() + (serve.timeoutMs || 120000);
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited early (code ${child.exitCode})`);
    try { await fetch(serve.url); return stop; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  stop();
  throw new Error(`Server did not answer at ${serve.url} in time`);
}

async function newContext(browser, config, viewportName, theme) {
  const v = config.viewports[viewportName];
  const context = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.scale || 1,
    isMobile: Boolean(v.mobile),
    hasTouch: Boolean(v.mobile),
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    reducedMotion: 'no-preference',
    locale: config.locale || 'en-US',
    timezoneId: config.timezone || 'Europe/Berlin',
  });
  if (config.theme.strategy === 'storage') {
    const value = (config.theme.values || {})[theme] ?? theme;
    await context.addInitScript(([key, val]) => { try { localStorage.setItem(key, val); } catch { /* storage blocked */ } }, [config.theme.key, value]);
  }
  if (config.theme.setup) await config.theme.setup(context, theme);
  const css = BASE_CSS + (config.css || '');
  await context.addInitScript((text) => {
    const add = () => { const s = document.createElement('style'); s.dataset.showcase = ''; s.textContent = text; document.head.appendChild(s); };
    if (document.head) add(); else addEventListener('DOMContentLoaded', add);
  }, css);
  return context;
}

function helpersFor(page, config, base) {
  const mouse = { x: 0, y: 0 };
  // Images on screen must be loaded and decoded (lazy + decoding="async" paint late), or media shows blank posters.
  const settle = async () => {
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForFunction(() => [...document.images]
      .filter((img) => { const r = img.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; })
      .every((img) => img.complete), null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(async () => {
      const visible = [...document.images].filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight && r.width > 0 && img.naturalWidth > 0;
      });
      await Promise.race([
        Promise.all(visible.map((img) => img.decode().catch(() => {}))),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }).catch(() => {});
  };
  const ready = async () => {
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    if (config.ready) await config.ready(page);
    await settle();
    await page.waitForTimeout(300);
  };
  const point = async (target) => {
    const locator = typeof target === 'string' ? page.locator(target).first() : target;
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Not visible: ${target}`);
    return { locator, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  return {
    page,
    ready,
    settle,
    pause: (ms = 600) => page.waitForTimeout(ms),
    goto: async (p) => { await page.goto(new URL(p, base).href); await ready(); },
    /** Glide the visible cursor to a target, then click it. */
    click: async (target, { pauseMs = 250 } = {}) => {
      const { x, y } = await point(target);
      await page.mouse.move(x, y, { steps: 18 });
      Object.assign(mouse, { x, y });
      await page.waitForTimeout(pauseMs);
      await page.mouse.down(); await page.waitForTimeout(70); await page.mouse.up();
      await page.waitForTimeout(pauseMs);
    },
    hover: async (target) => {
      const { x, y } = await point(target);
      await page.mouse.move(x, y, { steps: 18 });
      Object.assign(mouse, { x, y });
      await page.waitForTimeout(300);
    },
    /** Click a field, then type like a person. */
    type: async (target, text, { delay = 75 } = {}) => {
      const { locator, x, y } = await point(target);
      await page.mouse.move(x, y, { steps: 18 });
      await locator.click();
      await locator.pressSequentially(text, { delay });
      await page.waitForTimeout(400);
    },
    /** Smooth scroll by `dy` CSS pixels. */
    scroll: async (dy, { steps = 12 } = {}) => {
      for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await page.waitForTimeout(30); }
      await page.waitForTimeout(400);
    },
  };
}

async function captureShots(browser, config, base, outDir, only) {
  const items = [];
  const warnings = [];
  for (const shot of config.shots) {
    if (only && !only.has(shot.id)) continue;
    const buffers = {};
    for (const viewport of shot.viewports) {
      for (const theme of shot.themes) {
        const context = await newContext(browser, config, viewport, theme);
        const page = await context.newPage();
        const h = helpersFor(page, config, base);
        await h.goto(shot.path);
        if (shot.before) await shot.before(page, h);
        await page.mouse.move(-10, -10).catch(() => {});
        const file = shotFile(shot.id, viewport, theme);
        const abs = path.join(outDir, file);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        const buffer = await page.screenshot({ path: abs, fullPage: Boolean(shot.fullPage) });
        (buffers[viewport] ||= []).push(buffer);
        const v = config.viewports[viewport];
        items.push({
          id: shot.id, kind: 'screenshot', file, viewport, theme,
          caption: shot.caption, path: shot.path, hero: Boolean(shot.hero),
          width: v.width * (v.scale || 1), bytes: buffer.length,
        });
        console.log(`  shot  ${file}`);
        await context.close();
      }
    }
    const same = Object.entries(buffers).filter(([, list]) => list.length > 1 && list.every((b) => b.equals(list[0])));
    if (same.length) {
      warnings.push(`"${shot.id}" (${same.map(([v]) => v).join(', ')}) is pixel-identical in ${shot.themes.join(' and ')}: the theme ${config.theme.setup ? 'setup' : `strategy "${config.theme.strategy}"`} has no effect, or the app has one theme. Capture only the themes it has.`);
    }
  }
  return { items, warnings };
}

async function encodeGif(gifenc, jpeg, frames, flow, width) {
  const { GIFEncoder, quantize, applyPalette } = gifenc;
  const picked = selectGifFrames(frames, flow.fps, flow.holdMs);
  const images = picked.map(({ frame, delayMs }) => {
    const raw = jpeg.decode(frame.data, { useTArray: true, formatAsRGBA: true });
    return { ...downscaleRgba(raw.data, raw.width, raw.height, width), delayMs };
  });
  const { width: w, height: h } = images[0];
  const usable = images.filter((img) => img.width === w && img.height === h);
  // One shared palette (255 colours + 1 transparent slot) sampled across the clip avoids flicker.
  const step = Math.max(1, Math.floor(usable.length / 12));
  const samples = usable.filter((_, i) => i % step === 0);
  const sample = new Uint8Array(samples.length * w * h * 4);
  samples.forEach((img, i) => sample.set(img.data, i * w * h * 4));
  const palette = quantize(sample, 255);
  while (palette.length < 255) palette.push([0, 0, 0]);
  palette.push([0, 0, 0]);
  const transparentIndex = 255;
  const gif = GIFEncoder();
  let previous = null;
  for (const img of usable) {
    const index = applyPalette(img.data, palette);
    let out = index;
    if (previous) {
      out = new Uint8Array(index);
      for (let i = 0; i < out.length; i++) if (index[i] === previous[i]) out[i] = transparentIndex;
    }
    gif.writeFrame(out, w, h, {
      palette: previous ? undefined : palette, first: !previous, delay: img.delayMs,
      transparent: Boolean(previous), transparentIndex, dispose: 1, repeat: 0,
    });
    previous = index;
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

async function encodeWebm(ffmpeg, frames, flow, file) {
  const fps = 25;
  const sequence = constantRateFrames(frames, fps, flow.holdMs);
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', 'pipe:0',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-deadline', 'good', '-cpu-used', '4',
    '-pix_fmt', 'yuv420p', '-an', file];
  const child = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${stderr.trim()}`))));
  });
  for (const i of sequence) {
    if (!child.stdin.write(frames[i].data)) await new Promise((r) => child.stdin.once('drain', r));
  }
  child.stdin.end();
  await done;
  return sequence.length / fps;
}

/** Still frames of a clip on one PNG (outside the media folder) so a reviewer can check the motion without a player. */
async function contactSheet(browser, frames, flow) {
  const picked = selectGifFrames(frames, flow.fps, flow.holdMs);
  const count = Math.min(12, picked.length);
  const chosen = Array.from({ length: count }, (_, i) => picked[Math.round((i * (picked.length - 1)) / Math.max(1, count - 1))]);
  const start = frames[0].ts;
  const cells = chosen.map(({ frame }) => `<figure><img src="data:image/jpeg;base64,${frame.data.toString('base64')}"><figcaption>${(frame.ts - start).toFixed(1)}s</figcaption></figure>`).join('');
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.setContent(`<style>body{margin:0;padding:12px;background:#222;font:14px sans-serif;color:#eee;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    img{width:100%;display:block;border:1px solid #555}figure{margin:0}figcaption{padding-top:4px}</style>${cells}`);
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  const dir = path.join(os.tmpdir(), 'project-showcase-review');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${flow.id}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  return file;
}

async function captureFlows(browser, deps, ffmpeg, config, base, outDir, only) {
  const items = [];
  for (const flow of config.flows) {
    if (only && !only.has(flow.id)) continue;
    const viewport = config.viewports[flow.viewport];
    const widths = clipWidths(viewport, flow);
    const context = await newContext(browser, config, flow.viewport, flow.theme);
    if (flow.cursor !== false) await context.addInitScript(CURSOR_SCRIPT);
    const page = await context.newPage();
    const h = helpersFor(page, config, base);
    await h.goto(flow.path);
    if (flow.before) await flow.before(page, h);

    const cdp = await context.newCDPSession(page);
    const frames = [];
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      frames.push({ data: Buffer.from(data, 'base64'), ts: metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: widths.video, maxHeight: 4000, everyNthFrame: 1 });
    // A tiny repaint guarantees a first frame even on a static page.
    await page.evaluate(() => { document.documentElement.style.outline = '0 solid transparent'; });
    await page.waitForTimeout(500);
    await flow.run(page, h);
    await page.waitForTimeout(300);
    await cdp.send('Page.stopScreencast');

    const files = clipFiles(flow.id);
    fs.mkdirSync(path.join(outDir, 'clips'), { recursive: true });
    await page.evaluate(() => document.getElementById('__showcase_cursor')?.remove());
    await page.screenshot({ path: path.join(outDir, files.poster) });
    await context.close();
    if (frames.length === 0) throw new Error(`flow "${flow.id}" produced no frames`);

    const gif = await encodeGif(deps.gifenc, deps.jpeg, frames, flow, widths.gif);
    fs.writeFileSync(path.join(outDir, files.gif), gif);
    let durationS = frames[frames.length - 1].ts - frames[0].ts + flow.holdMs / 1000;
    const produced = { gif: files.gif, poster: files.poster };
    if (ffmpeg) {
      durationS = await encodeWebm(ffmpeg, frames, flow, path.join(outDir, files.webm));
      produced.webm = files.webm;
    }
    const sheet = await contactSheet(browser, frames, flow);
    console.log(`  review ${sheet}`);
    const bytes = Object.fromEntries(Object.entries(produced).map(([k, f]) => [k, fs.statSync(path.join(outDir, f)).size]));
    items.push({
      id: flow.id, kind: 'clip', files: produced, viewport: flow.viewport, theme: flow.theme,
      caption: flow.caption, path: flow.path, hero: Boolean(flow.hero), durationS: Math.round(durationS * 10) / 10,
      gifWidth: widths.gif, videoWidth: widths.video, bytes,
    });
    console.log(`  clip  ${files.gif} (${(gif.length / 1e6).toFixed(1)} MB)${produced.webm ? `, ${files.webm}` : ''}`);
    if (gif.length > 8e6) console.warn(`  warn  ${files.gif} is over 8 MB; shorten the flow or lower gifWidth/fps`);
  }
  return items;
}

const HELP = `Capture showcase media for a web app.

  node capture.mjs --config <file> [--url URL] [--serve] [--out DIR] [--only id,id]
                   [--no-shots] [--no-clips] [--headed]
  node capture.mjs --setup

--config   capture.config.mjs (default output folder: the config's folder)
--url      override config.url (e.g. a local preview)
--serve    start config.serve.command and capture config.serve.url
--only     recapture only these shot/flow ids; other manifest entries are kept
Tool dependencies install into SHOWCASE_DEPS (default ~/.cache/project-showcase).`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.has('help')) return console.log(HELP);
  const deps = ensureDeps();
  if (args.flags.has('setup')) return console.log(`Dependencies ready in ${depsDir()}`);
  if (!args.config) throw new Error('--config is required (see --help)');

  const configPath = path.resolve(args.config);
  const config = normalizeConfig((await import(pathToFileURL(configPath).href)).default);
  const outDir = path.resolve(args.out || config.out || path.dirname(configPath));
  const projectDir = git(path.dirname(configPath), ['rev-parse', '--show-toplevel']) || path.dirname(configPath);
  let stopServer = null;
  let base = args.url || config.url;
  if (args.flags.has('serve')) {
    if (!config.serve) throw new Error('--serve needs config.serve { command, url }');
    stopServer = await startServer(config.serve, projectDir);
    base = config.serve.url;
  }
  process.on('exit', () => stopServer && stopServer());

  const ffmpeg = findFfmpeg();
  if (!ffmpeg) console.warn('warn  no ffmpeg found; clips will have GIF and poster but no WebM');
  const browser = await deps.playwright.chromium.launch({ headless: !args.flags.has('headed') });
  console.log(`Capturing ${base} -> ${outDir}`);
  try {
    const shots = args.flags.has('no-shots') ? { items: [], warnings: [] } : await captureShots(browser, config, base, outDir, args.only);
    const clips = args.flags.has('no-clips') ? [] : await captureFlows(browser, deps, ffmpeg, config, base, outDir, args.only);
    const manifestPath = path.join(outDir, 'manifest.json');
    const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { items: [] };
    let items = [...shots.items, ...clips];
    const partial = args.only || args.flags.has('no-shots') || args.flags.has('no-clips');
    if (partial) {
      items = mergeItems(previous.items || [], items);
    } else {
      for (const file of staleFiles(previous.items || [], items)) {
        fs.rmSync(path.join(outDir, file), { force: true });
        console.log(`  removed stale ${file}`);
      }
    }
    const manifest = {
      schema: 1,
      tool: TOOL,
      project: config.name || path.basename(projectDir),
      source: base,
      commit: git(projectDir, ['rev-parse', '--short', 'HEAD']),
      capturedAt: new Date().toISOString(),
      viewports: config.viewports,
      warnings: shots.warnings,
      items,
    };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    for (const w of shots.warnings) console.warn(`warn  ${w}`);
    console.log(`Wrote ${path.relative(process.cwd(), manifestPath) || manifestPath} (${manifest.items.length} items)`);
  } finally {
    await browser.close();
    if (stopServer) stopServer();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
