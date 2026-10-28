import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const skillsRoot = path.join(root, 'skills');
const skills = fs.readdirSync(skillsRoot, { withFileTypes: true });
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `Publish actual source, not a link: ${absolute}`);
    if (entry.isDirectory()) walk(absolute);
    else files.push(absolute);
  }
}
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, `${args.join(' ')} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}
for (const skill of skills) {
  assert(skill.isDirectory(), `Expected a skill directory: ${skill.name}`);
  const directory = path.join(skillsRoot, skill.name);
  const entrypoint = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
  assert(entrypoint.startsWith('---\n') || entrypoint.startsWith('---\r\n'), `Missing frontmatter: ${skill.name}`);
  const frontmatter = entrypoint.split(/\r?\n---(?:\r?\n|$)/)[0];
  assert(new RegExp(`^name: ${skill.name}$`, 'm').test(frontmatter.replaceAll('\r', '')), `Skill name mismatch: ${skill.name}`);
  assert(/^description:\s*\S/m.test(frontmatter), `Missing description: ${skill.name}`);
  walk(directory);
}
const checks = [
  ['machine-specific home path', /[A-Za-z]:\\(?:\\)?Users\\|\/Users\/[^/\s]+\/|\/home\/[^/\s]+\//i],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['service credential', /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|AKIA[A-Z0-9]{16})\b/],
];
walk(path.join(root, 'scripts'));
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of checks) assert(!pattern.test(text), `${label} detected in ${path.relative(root, file)}`);
  if (file.endsWith('.mjs') || file.endsWith('.js')) run(['--check', file]);
}
run(['--test', 'skills/task-mode/scripts/state.test.mjs']);
run(['--test', 'scripts/sync/sync.test.mjs']);
run(['scripts/skills-sync.mjs', 'help']);
console.log(`Validated ${skills.length} skills and ${files.length} source files; syntax, publication scan, state and sync integration tests passed.`);
