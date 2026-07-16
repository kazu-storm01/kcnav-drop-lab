import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sourcePath =
  '.codex/visualizations/2026/07/16/kcnav-drop-lab/kcnav-drop-lab.html';
const outputPath = 'outputs/kcnav-drop-lab.html';
const scannerPath = 'scripts/check-public.mjs';
const failures = [];

function fail(message) {
  failures.push(message);
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function decodeHtml(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&(amp|apos|gt|lt|quot);/g, (_, name) => named[name]);
}

function checkJavaScript(html, label) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  if (!scripts.length) {
    fail(`${label}: inline JavaScript was not found`);
    return;
  }

  scripts.forEach((match, index) => {
    try {
      new vm.Script(match[1], { filename: `${label}:script-${index + 1}.js` });
    } catch (error) {
      fail(`${label}: JavaScript syntax error: ${error.message}`);
    }
  });
}

function checkSensitiveText(text, label) {
  const checks = [
    {
      name: 'non-noreply email address',
      regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      allowed: (value) =>
        value.endsWith('@users.noreply.github.com') ||
        value === 'noreply@github.com',
    },
    {
      name: 'second-level play timestamp',
      regex: /\b20\d{2}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}:\d{2}\b/g,
    },
    {
      name: 'local user path',
      regex: /(?:[A-Z]:\\Users\\[^\\\s]+|\/Users\/[^/\s]+|\/home\/[^/\s]+)/gi,
    },
    {
      name: 'private key',
      regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
    },
    {
      name: 'GitHub access token',
      regex: /\b(?:gh[opusr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
    },
  ];

  for (const check of checks) {
    for (const match of text.matchAll(check.regex)) {
      if (check.allowed?.(match[0])) continue;
      fail(`${label}: found ${check.name}: ${match[0]}`);
    }
  }
}

const trackedFiles = runGit(['ls-files'])
  .split(/\r?\n/)
  .filter(Boolean);

for (const path of trackedFiles) {
  if (path === scannerPath) continue;
  const text = readFileSync(path, 'utf8');
  if (text.includes('\0')) continue;
  checkSensitiveText(text, path);
}

const commits = runGit(['rev-list', '--all'])
  .split(/\r?\n/)
  .filter(Boolean)
  .filter(
    (commit) =>
      !(
        process.env.GITHUB_EVENT_NAME === 'pull_request' &&
        commit === process.env.GITHUB_SHA
      ),
  );

for (const commit of commits) {
  const identities = [
    ['author', runGit(['show', '-s', '--format=%ae', commit])],
    ['committer', runGit(['show', '-s', '--format=%ce', commit])],
  ];
  for (const [role, email] of identities) {
    if (
      !email.endsWith('@users.noreply.github.com') &&
      email !== 'noreply@github.com'
    ) {
      fail(`${commit}: commit ${role} uses a public email address: ${email}`);
    }
  }

  const files = runGit(['ls-tree', '-r', '--name-only', commit])
    .split(/\r?\n/)
    .filter((path) => path && path !== scannerPath);

  for (const path of files) {
    let text;
    try {
      text = execFileSync('git', ['show', `${commit}:${path}`], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch {
      continue;
    }
    if (text.includes('\0')) continue;
    checkSensitiveText(text, `${commit}:${path}`);
  }
}

const source = readFileSync(sourcePath, 'utf8').trim();
const normalizedSource = source.replace(/\r\n/g, '\n');
const output = readFileSync(outputPath, 'utf8');

if (!/^<!doctype html>/i.test(output.trimStart())) {
  fail(`${outputPath}: missing HTML doctype`);
}
if (!/<title>Kcnav Drop Lab<\/title>/i.test(output)) {
  fail(`${outputPath}: expected title was not found`);
}

const srcdocMatch = output.match(
  /<iframe\b[^>]*\bsrcdoc="([\s\S]*?)"\s*><\/iframe>/i,
);
if (!srcdocMatch) {
  fail(`${outputPath}: application iframe srcdoc was not found`);
} else {
  const srcdoc = decodeHtml(srcdocMatch[1]).replace(/\r\n/g, '\n');
  if (!srcdoc.includes(normalizedSource)) {
    fail(`${outputPath}: distributed HTML is not synchronized with the source`);
  }
}

for (const [path, html] of [
  [sourcePath, source],
  [outputPath, output],
]) {
  if (!/const seedLogs\s*=\s*\[\s*\]\s*;/.test(html)) {
    fail(`${path}: initial battle logs must be empty`);
  }
  if (/seed-\d+/.test(html)) {
    fail(`${path}: legacy seeded battle log IDs remain`);
  }
}

checkJavaScript(source, sourcePath);

if (failures.length) {
  console.error('Public build validation failed:\n');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(
  `Public build validation passed (${trackedFiles.length} tracked files, ${commits.length} commits).`,
);
