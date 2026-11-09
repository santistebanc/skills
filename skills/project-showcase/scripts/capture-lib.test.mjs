import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConfig, shotFile, clipFiles, clipWidths, selectGifFrames, constantRateFrames,
  staleFiles, mergeItems, downscaleRgba, parseArgs,
} from './capture-lib.mjs';

const flow = { id: 'demo', caption: 'Demo', run: async () => {} };

test('normalizeConfig fills defaults and keeps custom viewports exclusive', () => {
  const config = normalizeConfig({ url: 'https://example.com', shots: [{ id: 'home', caption: 'Home' }], flows: [flow] });
  assert.deepEqual(config.themes, ['light', 'dark']);
  assert.deepEqual(config.shots[0].viewports, ['desktop', 'mobile']);
  assert.equal(config.shots[0].path, '/');
  assert.equal(config.flows[0].viewport, 'desktop');
  assert.equal(config.flows[0].theme, 'light');
  const only = normalizeConfig({ url: 'x', viewports: { desktop: { width: 800, height: 600 } }, shots: [{ id: 'a', caption: 'A' }] });
  assert.deepEqual(only.shots[0].viewports, ['desktop']);
});

test('normalizeConfig reports every problem at once', () => {
  assert.throws(() => normalizeConfig({
    theme: { strategy: 'storage' },
    shots: [{ id: 'Bad Id' }, { id: 'dup', caption: 'x', viewports: ['tablet'] }, { id: 'dup', caption: 'y' }],
    flows: [{ id: 'f', caption: 'f' }],
  }), (error) => {
    for (const part of ['url', 'theme.key', 'kebab-case', 'duplicate id "dup"', 'unknown viewport "tablet"', 'add a caption', '`run`']) {
      assert(error.message.includes(part), `missing: ${part}`);
    }
    return true;
  });
});

test('file names are stable', () => {
  assert.equal(shotFile('home', 'mobile', 'dark'), 'screens/home-mobile-dark.png');
  assert.deepEqual(clipFiles('find'), { gif: 'clips/find.gif', webm: 'clips/find.webm', poster: 'clips/find.png' });
});

test('clipWidths caps video at the viewport and keeps widths even', () => {
  assert.deepEqual(clipWidths({ width: 1440, scale: 1 }), { video: 1440, gif: 800 });
  assert.deepEqual(clipWidths({ width: 391, scale: 2, mobile: true }), { video: 390, gif: 320 });
  assert.deepEqual(clipWidths({ width: 1920 }, { gifWidth: 641 }), { video: 1440, gif: 640 });
});

test('selectGifFrames throttles to fps, keeps the newest pixels and holds the last frame', () => {
  const frames = [0, 0.02, 0.05, 0.2, 1.2].map((ts, i) => ({ ts, data: i }));
  const picked = selectGifFrames(frames, 10, 1500);
  assert.deepEqual(picked.map((p) => p.frame.data), [2, 3, 4]);
  assert.deepEqual(picked.map((p) => p.delayMs), [200, 1000, 1500]);
  assert.deepEqual(selectGifFrames([], 10, 1500), []);
});

test('constantRateFrames repeats the latest frame until the next change', () => {
  const frames = [{ ts: 0 }, { ts: 0.1 }, { ts: 0.3 }];
  assert.deepEqual(constantRateFrames(frames, 10, 200), [0, 1, 1, 2, 2]);
});

test('staleFiles lists only files the new run no longer produces', () => {
  const previous = [
    { id: 'a', file: 'screens/a-desktop-light.png' },
    { id: 'b', files: { gif: 'clips/b.gif', webm: 'clips/b.webm' } },
    { id: 'evil', file: '../outside.png' },
  ];
  const next = [{ id: 'b', files: { gif: 'clips/b.gif' } }];
  assert.deepEqual(staleFiles(previous, next), ['screens/a-desktop-light.png', 'clips/b.webm']);
});

test('mergeItems replaces recaptured ids in place and appends new ones', () => {
  const previous = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }, { id: 'b', v: 2 }, { id: 'c', v: 1 }];
  const next = [{ id: 'b', v: 3 }, { id: 'd', v: 1 }];
  assert.deepEqual(mergeItems(previous, next), [{ id: 'a', v: 1 }, { id: 'b', v: 3 }, { id: 'c', v: 1 }, { id: 'd', v: 1 }]);
});

test('downscaleRgba averages pixel blocks', () => {
  const data = new Uint8Array([0, 0, 0, 255, 200, 100, 50, 255]);
  const out = downscaleRgba(data, 2, 1, 1);
  assert.deepEqual([...out.data], [100, 50, 25, 255]);
  assert.equal(downscaleRgba(data, 2, 1, 4).data, data);
});

test('parseArgs reads values and flags', () => {
  const args = parseArgs(['--config', 'c.mjs', '--only', 'a, b', '--serve', '--no-clips']);
  assert.equal(args.config, 'c.mjs');
  assert.deepEqual([...args.only], ['a', 'b']);
  assert(args.flags.has('serve') && args.flags.has('no-clips'));
  assert.throws(() => parseArgs(['--nope']), /Unknown argument/);
  assert.throws(() => parseArgs(['--url']), /needs a value/);
});
