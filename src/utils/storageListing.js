// 解析云开发控制台导出的文件清单（HTML 表格，或带「文件ID」列的 CSV），供「导入历史文件」使用。
// 上传时间、是否合法等判断由服务端做，这里只负责把清单读成 { fileID, name, size, time } 列表。

const UNIT = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };

// "1.95 MB" → 字节数；解析不了返回 0
export function parseSize(text) {
  const m = String(text || '').trim().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
  return m ? Math.round(parseFloat(m[1]) * UNIT[m[2].toUpperCase()]) : 0;
}

export function formatSize(bytes) {
  if (bytes >= UNIT.GB) return (bytes / UNIT.GB).toFixed(2) + ' GB';
  if (bytes >= UNIT.MB) return (bytes / UNIT.MB).toFixed(1) + ' MB';
  if (bytes >= UNIT.KB) return (bytes / UNIT.KB).toFixed(1) + ' KB';
  return bytes + ' B';
}

// cloud://环境ID.存储桶/web/files/xxx.pdf → /web/files/xxx.pdf（只比较路径，不受环境/桶前缀写法影响）
export function pathOf(fileID) {
  const m = String(fileID || '').trim().match(/^cloud:\/\/[^/]+(\/.*)$/);
  return m ? m[1] : null;
}

const unescapeHtml = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const stripTags = (s) => unescapeHtml(s.replace(/<[^>]*>/g, '')).trim();

const SIZE_RE = /^[\d.]+\s*(B|KB|MB|GB)$/i;
const TIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;

function parseHtml(text) {
  const out = [];
  for (const row of text.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const cells = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map(stripTags);
    const idIdx = cells.findIndex((c) => /^cloud:\/\//.test(c));
    if (idIdx < 0) continue;
    out.push({
      fileID: cells[idIdx],
      name: (idIdx > 0 ? cells[idIdx - 1] : '') || cells[idIdx].split('/').pop(),
      size: cells.find((c) => SIZE_RE.test(c)) || '',
      time: cells.find((c) => TIME_RE.test(c)) || ''
    });
  }
  return out;
}

function splitCsvLine(line) {
  const cells = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]);
  const find = (...keys) => header.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));
  const idIdx = find('文件id', 'fileid');
  if (idIdx < 0) return [];
  const nameIdx = find('文件名', 'name');
  const sizeIdx = find('大小', 'size');
  const timeIdx = find('时间', 'time');
  return lines.slice(1).map(splitCsvLine).filter((c) => /^cloud:\/\//.test(c[idIdx] || '')).map((c) => ({
    fileID: c[idIdx],
    name: (nameIdx >= 0 && c[nameIdx]) || c[idIdx].split('/').pop(),
    size: sizeIdx >= 0 ? c[sizeIdx] : '',
    time: timeIdx >= 0 ? c[timeIdx] : ''
  }));
}

// 解析云存储控制台导出的文件清单（HTML 表格，或带「文件ID」列的 CSV）。按文件 ID 去重
export function parseStorageListing(text) {
  const t = String(text || '');
  const rows = /<tr[\s>]/i.test(t) ? parseHtml(t) : parseCsv(t);
  const seen = new Set();
  return rows.filter((r) => (seen.has(r.fileID) ? false : seen.add(r.fileID)));
}
