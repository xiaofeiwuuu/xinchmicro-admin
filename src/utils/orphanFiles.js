// 孤儿文件清理的纯逻辑：解析云存储控制台导出的文件清单，和数据库里的文件引用对比，找出"没人用"的文件。
//
// 宁可漏删也不能误删，所以这里的每个判断都偏保守：
//  - 只处理 /web/files/ 下的文件（本系统自己上传的目录）
//  - 太新（不足 24 小时）或看不出上传时间的文件不动：可能是别人正在编辑、已上传还没保存
//  - 任何引用读取不完整时整体拒绝（见 sanityCheck），否则会把"没读到引用"的文件误当成孤儿

export const FILE_PREFIX = '/web/files/';
export const MIN_AGE_HOURS = 24;

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

// 文件名里的毫秒时间戳（本系统上传的文件名形如 1741490893054.pdf 或 1741490893054_ab12cd34.pdf）
export function timestampOf(name) {
  const m = String(name || '').match(/^(\d{13})(?:[_.]|$)/);
  return m ? parseInt(m[1], 10) : null;
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

// 文件上传时间（毫秒）：优先用文件名里的时间戳；没有就用清单里的时间（控制台显示的是北京时间）
export function uploadedAt(file) {
  const fromName = timestampOf(file.name);
  if (fromName) return fromName;
  if (TIME_RE.test(file.time || '')) {
    const t = Date.parse(file.time.replace(' ', 'T') + '+08:00');
    return isNaN(t) ? null : t;
  }
  return null;
}

// 对比：files 是云存储清单，refIds 是数据库里所有被引用的文件 ID
export function computeOrphans({ files, refIds, now = Date.now(), minAgeHours = MIN_AGE_HOURS }) {
  const refPaths = new Set((refIds || []).map(pathOf).filter(Boolean));
  const listed = new Set();
  const result = { orphans: [], referenced: [], foreign: [], tooNew: [], missingRefs: [] };
  for (const f of files) {
    const p = pathOf(f.fileID);
    if (p) listed.add(p);
    if (!p || !p.startsWith(FILE_PREFIX)) { result.foreign.push(f); continue; }
    if (refPaths.has(p)) { result.referenced.push(f); continue; }
    const t = uploadedAt(f);
    if (t === null || now - t < minAgeHours * 3600 * 1000) { result.tooNew.push(f); continue; }
    result.orphans.push({ ...f, bytes: parseSize(f.size) });
  }
  // 数据库引用了、但清单里没有的文件（可能已经丢了，也可能是清单不完整）
  result.missingRefs = [...new Set(refIds || [])].filter((id) => { const p = pathOf(id); return p && !listed.has(p); });
  return result;
}

// 动手前的整体安全检查：返回 { ok, reasons }。任何一条不过都不允许删除
export function sanityCheck({ fileCount, refCount, orphanCount, refsComplete }) {
  const reasons = [];
  if (!refsComplete) reasons.push('数据库引用没有完整读取，无法判断哪些文件没人用');
  if (!refCount) reasons.push('没有读取到任何数据库引用（线上有 600 多个产品 PDF，不可能为 0）');
  if (!fileCount) reasons.push('文件清单为空');
  if (fileCount && orphanCount > fileCount * 0.7) reasons.push(`疑似孤儿占清单的 ${Math.round(orphanCount / fileCount * 100)}%，比例异常，可能是引用读取不全或选错了清单`);
  return { ok: reasons.length === 0, reasons };
}

// 把 ids 切成一批一批（云存储一次最多删 50 个）
export function chunk(list, size = 50) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
