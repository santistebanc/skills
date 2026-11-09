// Pure helpers for capture.mjs. No browser or npm dependencies, so they can be unit tested.

export const DEFAULT_VIEWPORTS = {
  desktop: { width: 1440, height: 900, scale: 1 },
  mobile: { width: 390, height: 844, scale: 2, mobile: true },
};

export const DEFAULT_THEMES = ['light', 'dark'];

const ID = /^[a-z0-9][a-z0-9-]*$/;

/** Validate a capture config and fill defaults. Throws with every problem listed. */
export function normalizeConfig(raw) {
  const problems = [];
  const config = { ...raw };
  config.viewports = raw.viewports || DEFAULT_VIEWPORTS;
  config.themes = raw.themes || DEFAULT_THEMES;
  config.theme = raw.theme || { strategy: 'media' };
  config.shots = raw.shots || [];
  config.flows = raw.flows || [];
  if (!raw.url && !raw.serve) problems.push('set `url` (live or preview URL) or `serve`');
  if (!Array.isArray(config.themes) || config.themes.length === 0) problems.push('`themes` must be a non-empty array');
  const { strategy } = config.theme;
  if (!config.theme.setup && !['media', 'storage'].includes(strategy)) problems.push('`theme.strategy` must be "media" or "storage", or provide `theme.setup`');
  if (strategy === 'storage' && !config.theme.key) problems.push('`theme.key` is required for the storage strategy');
  const seen = new Set();
  const checkId = (item, kind) => {
    if (!ID.test(item.id || '')) problems.push(`${kind} id "${item.id}" must be lowercase kebab-case`);
    if (seen.has(item.id)) problems.push(`duplicate id "${item.id}"`);
    seen.add(item.id);
  };
  config.shots = config.shots.map((shot) => {
    checkId(shot, 'shot');
    const viewports = shot.viewports || Object.keys(config.viewports);
    const themes = shot.themes || config.themes;
    for (const v of viewports) if (!config.viewports[v]) problems.push(`shot "${shot.id}": unknown viewport "${v}"`);
    if (!shot.caption) problems.push(`shot "${shot.id}": add a caption (used as alt text)`);
    return { path: '/', ...shot, viewports, themes };
  });
  config.flows = config.flows.map((flow) => {
    checkId(flow, 'flow');
    const viewport = flow.viewport || 'desktop';
    const theme = flow.theme || config.themes[0];
    if (!config.viewports[viewport]) problems.push(`flow "${flow.id}": unknown viewport "${viewport}"`);
    if (typeof flow.run !== 'function') problems.push(`flow "${flow.id}": \`run\` must be an async function`);
    if (!flow.caption) problems.push(`flow "${flow.id}": add a caption (used as alt text)`);
    return { path: '/', fps: 10, holdMs: 1500, ...flow, viewport, theme };
  });
  if (problems.length) throw new Error(`Invalid capture config:\n- ${problems.join('\n- ')}`);
  return config;
}

export function shotFile(id, viewport, theme) {
  return `screens/${id}-${viewport}-${theme}.png`;
}

export function clipFiles(id) {
  return { gif: `clips/${id}.gif`, webm: `clips/${id}.webm`, poster: `clips/${id}.png` };
}

/** Default output widths for a flow. Screencast frames arrive in CSS pixels, so video is capped at the viewport width. */
export function clipWidths(viewport, flow = {}) {
  const even = (n) => n - (n % 2);
  return {
    video: even(Math.min(flow.videoWidth || 1440, viewport.width)),
    gif: even(flow.gifWidth || (viewport.mobile ? 320 : 800)),
  };
}

/**
 * Pick GIF frames from screencast frames (timestamps in seconds, emitted only when the screen changes).
 * Keeps at most `fps` frames per second; each kept frame lasts until the next kept one; the last is held.
 */
export function selectGifFrames(frames, fps, holdMs) {
  if (frames.length === 0) return [];
  const minGap = 1 / fps;
  const kept = [];
  for (const frame of frames) {
    const last = kept[kept.length - 1];
    if (!last || frame.ts - last.ts >= minGap) kept.push(frame);
    else kept[kept.length - 1] = { ...frame, ts: last.ts }; // newer pixels, same slot
  }
  return kept.map((frame, i) => ({
    frame,
    delayMs: i < kept.length - 1 ? Math.max(20, Math.round((kept[i + 1].ts - frame.ts) * 1000)) : holdMs,
  }));
}

/** Expand change-driven frames into a constant-rate sequence for the video encoder. */
export function constantRateFrames(frames, fps, holdMs) {
  if (frames.length === 0) return [];
  const start = frames[0].ts;
  const end = frames[frames.length - 1].ts + holdMs / 1000;
  const out = [];
  let j = 0;
  for (let t = start; t < end; t += 1 / fps) {
    while (j + 1 < frames.length && frames[j + 1].ts <= t) j++;
    out.push(j);
  }
  return out;
}

/** Files listed in the previous manifest that this run no longer produces. */
export function staleFiles(previousItems, nextItems) {
  const filesOf = (items) => items.flatMap((item) => (item.file ? [item.file] : Object.values(item.files || {})));
  const keep = new Set(filesOf(nextItems));
  return filesOf(previousItems).filter((file) => !keep.has(file) && !file.includes('..'));
}

/** Merge a partial run into the previous manifest items: recaptured ids replace theirs in place, new ids append. */
export function mergeItems(previousItems, nextItems) {
  const byId = new Map();
  for (const item of nextItems) byId.set(item.id, [...(byId.get(item.id) || []), item]);
  const out = [];
  for (const item of previousItems) {
    if (!byId.has(item.id)) out.push(item);
    else if (byId.get(item.id).length) { out.push(...byId.get(item.id)); byId.set(item.id, []); }
  }
  for (const rest of byId.values()) out.push(...rest);
  return out;
}

/** Area-average downscale of RGBA pixels. */
export function downscaleRgba(data, width, height, targetWidth) {
  if (targetWidth >= width) return { data, width, height };
  const ratio = width / targetWidth;
  const tw = targetWidth;
  const th = Math.max(1, Math.round(height / ratio));
  const out = new Uint8Array(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const y0 = Math.floor(y * ratio);
    const y1 = Math.min(height, Math.max(y0 + 1, Math.floor((y + 1) * ratio)));
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor(x * ratio);
      const x1 = Math.min(width, Math.max(x0 + 1, Math.floor((x + 1) * ratio)));
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * width + sx) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
      }
      const o = (y * tw + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  return { data: out, width: tw, height: th };
}

export function parseArgs(argv) {
  const args = { only: null, flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      if (i + 1 >= argv.length) throw new Error(`${arg} needs a value`);
      return argv[++i];
    };
    if (arg === '--config') args.config = value();
    else if (arg === '--url') args.url = value();
    else if (arg === '--out') args.out = value();
    else if (arg === '--only') args.only = new Set(value().split(',').map((s) => s.trim()).filter(Boolean));
    else if (['--serve', '--setup', '--headed', '--no-clips', '--no-shots', '--help'].includes(arg)) args.flags.add(arg.slice(2));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}
