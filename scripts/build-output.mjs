import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath =
  '.codex/visualizations/2026/07/16/kcnav-drop-lab/kcnav-drop-lab.html';
const outputPath = 'outputs/kcnav-drop-lab.html';
const fragmentStart = '<div id="kcnav-drop-lab">';
const fragmentEnd = '\n\n<script src="https://unpkg.com/@floating-ui/core';

function decodeHtml(value) {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&(amp|apos|gt|lt|quot);/g, (_, name) => named[name]);
}

function encodeHtmlAttribute(value) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      })[char],
  );
}

function allowImageDataHosts(html) {
  return html
    .replaceAll(
      'img-src blob: data: https://yksk.kancollewiki.net',
      'img-src blob: data: https://w01y.kancolle-server.com https://raw.githubusercontent.com https://yksk.kancollewiki.net',
    )
    .replaceAll(
      'img-src blob: data: https://raw.githubusercontent.com https://yksk.kancollewiki.net',
      'img-src blob: data: https://w01y.kancolle-server.com https://raw.githubusercontent.com https://yksk.kancollewiki.net',
    )
    .replaceAll(
      'connect-src blob: data:;',
      'connect-src blob: data: https://raw.githubusercontent.com;',
    );
}

const source = readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n').trim();
let output = readFileSync(outputPath, 'utf8');
const match = output.match(
  /<iframe\b[^>]*\bsrcdoc="([\s\S]*?)"\s*><\/iframe>/i,
);

if (!match) throw new Error('Application iframe srcdoc was not found');

let srcdoc = decodeHtml(match[1]).replace(/\r\n/g, '\n');
const start = srcdoc.indexOf(fragmentStart);
const end = srcdoc.indexOf(fragmentEnd, start);

if (start < 0 || end < 0) {
  throw new Error('Application fragment boundaries were not found');
}

srcdoc = allowImageDataHosts(
  `${srcdoc.slice(0, start)}${source}${srcdoc.slice(end)}`,
);
output = allowImageDataHosts(
  output.replace(match[1], () => encodeHtmlAttribute(srcdoc)),
);

writeFileSync(outputPath, output);
console.log(`Built ${outputPath} from ${sourcePath}`);
