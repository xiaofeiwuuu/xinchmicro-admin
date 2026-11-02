// 中英文数据（英文名称、英文版 PDF、英文手册）相关的纯函数，页面里的逻辑尽量放在这里以便单独验证。

export const LANG_OPTIONS = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' }
];

export const langLabel = (lang) => {
  const found = LANG_OPTIONS.find((o) => o.value === lang);
  return found ? found.label : lang || '-';
};

// 手册列表的查询参数：去掉空值。语言不选时传 all——服务端不带 lang 时只返回中文手册
export function buildManualQuery({ page, pageSize, type, keyword, lang } = {}) {
  const query = { page, pageSize, lang: lang || 'all' };
  if (type) query.type = type;
  if (typeof keyword === 'string' && keyword.trim()) query.keyword = keyword.trim();
  return query;
}

// 产品列表的查询参数：去掉空值；enFile 为 has / missing
export function buildProductQuery({ page, pageSize, name, catalogId, enFile } = {}) {
  const query = { page, pageSize };
  if (typeof name === 'string' && name.trim()) query.name = name.trim();
  if (catalogId) query.catalogId = catalogId;
  if (enFile === 'has' || enFile === 'missing') query.enFile = enFile;
  return query;
}

const hasText = (value) => typeof value === 'string' && value.trim() !== '';
export const hasChineseFile = (product) => !!product && hasText(product.fileID);
export const hasEnglishFile = (product) => !!product && hasText(product.fileIDEn);

// 英文版覆盖率（百分比，取整）；没有产品时为 0
export function coveragePercent(stats) {
  if (!stats || !stats.total) return 0;
  return Math.round((stats.withEnFile / stats.total) * 100);
}

// ---------------- 批量关联英文 PDF ----------------

// 从英文 PDF 文件名解析产品名。约定文件名为「产品名_EN.pdf」（也支持 -EN、空格 EN、ENG、English，
// 大小写不限）。必须有分隔符：避免把名字本身以 EN 结尾的型号误截断。
export function parseEnglishPdfName(fileName) {
  const base = String(fileName == null ? '' : fileName).trim().replace(/^.*[\\/]/, '');
  if (!/\.pdf$/i.test(base)) return { ok: false, reason: '不是 PDF 文件' };
  const stem = base.replace(/\.pdf$/i, '').trim();
  const match = stem.match(/^(.+?)[\s_-]+(?:en|eng|english)$/i);
  if (!match || !match[1].trim()) {
    return { ok: false, reason: '文件名需要以 _EN 结尾，例如 XC1234_EN.pdf' };
  }
  return { ok: true, name: match[1].trim() };
}

// 根据文件路径里的文件夹名找到对应的目录。
// 约定：把英文 PDF 按目录名分文件夹存放（<任意根文件夹>/<目录名>/XC1234_EN.pdf），
// 用「选择文件夹」上传时，文件所在文件夹的名字就是目录名。这样同名产品（线上约三成产品名在多个目录里重复）也能区分。
// 先看直接父文件夹，再依次往上找；不区分大小写和首尾空格；找不到返回 null。
export function catalogFromPath(relativePath, catalogs) {
  const parts = String(relativePath == null ? '' : relativePath).split(/[\\/]/).filter(Boolean);
  const folders = parts.slice(0, -1).reverse(); // 去掉文件名，从最近的文件夹开始
  const key = (s) => String(s).trim().toLowerCase();
  const list = catalogs || [];
  for (const folder of folders) {
    const found = list.find((c) => key(c.name) === key(folder));
    if (found) return found;
  }
  return null;
}

// 把已上传的文件整理成批量接口的 items。
// entries: [{ fileName, fileID, url, catalogId? }]：catalogId 是该文件自己的目录（来自文件夹名），优先于统一的 catalogId。
// 同一个目录里产品名重复（不区分大小写）的只保留第一个，其余列入 skipped；不同目录里的同名文件互不冲突。
// fileNames 与 items 一一对应，用来把服务端报告里的序号还原成文件名。
export function buildBulkItems(entries, { catalogId } = {}) {
  const items = [];
  const fileNames = [];
  const skipped = [];
  const seen = new Map();
  (entries || []).forEach((entry) => {
    const parsed = parseEnglishPdfName(entry.fileName);
    if (!parsed.ok) {
      skipped.push({ fileName: entry.fileName, reason: parsed.reason, fileID: entry.fileID });
      return;
    }
    if (!entry.fileID) {
      skipped.push({ fileName: entry.fileName, reason: '文件还没有上传成功' });
      return;
    }
    const targetCatalog = entry.catalogId || catalogId || null;
    const key = `${targetCatalog || 0}:${parsed.name.toLowerCase()}`;
    if (seen.has(key)) {
      skipped.push({ fileName: entry.fileName, reason: `与 ${seen.get(key)} 对应同一个产品`, fileID: entry.fileID });
      return;
    }
    seen.set(key, entry.fileName);
    const item = { name: parsed.name, fileIDEn: entry.fileID };
    if (entry.url) item.pdfUrlEn = entry.url;
    if (targetCatalog) item.catalogId = targetCatalog;
    items.push(item);
    fileNames.push(entry.fileName);
  });
  return { items, fileNames, skipped };
}

export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// 并发执行异步任务：最多 concurrency 个同时进行，结果与输入顺序一致。
// 单个任务失败不影响其它任务，结果为 { ok: false, error }；shouldStop() 返回 true 后不再启动新任务。
export async function runPool(list, worker, { concurrency = 3, onProgress, shouldStop } = {}) {
  const results = new Array(list.length);
  let next = 0;
  let done = 0;
  const run = async () => {
    while (next < list.length) {
      if (shouldStop && shouldStop()) return;
      const index = next++;
      try {
        results[index] = { ok: true, value: await worker(list[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
      done++;
      if (onProgress) onProgress(done, list.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, run));
  return results;
}

// 合并分批提交的批量接口报告；每批的 index 是批内序号，需要加上该批的起始偏移
export function mergeBulkReports(parts) {
  const merged = { total: 0, matched: 0, updated: 0, notFound: [], ambiguous: [], conflicts: [], invalid: [] };
  (parts || []).forEach(({ report, offset }) => {
    if (!report) return;
    merged.total += report.total || 0;
    merged.matched += report.matched || 0;
    merged.updated += report.updated || 0;
    ['notFound', 'ambiguous', 'conflicts', 'invalid'].forEach((key) => {
      (report[key] || []).forEach((entry) => merged[key].push({ ...entry, index: entry.index + offset }));
    });
  });
  return merged;
}

// 报告里"没能关联上"的条目数
export function unmatchedCount(report) {
  if (!report) return 0;
  return ['notFound', 'ambiguous', 'conflicts', 'invalid'].reduce((n, key) => n + (report[key] || []).length, 0);
}

// ---------------- PDF 上传 ----------------

// 上传前检查，返回错误提示；通过则返回 null
export function validatePdfFile(file, maxSizeMB = 20) {
  const isPdf = !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
  if (!isPdf) return '只能上传PDF文件!';
  if (maxSizeMB && file.size / 1024 / 1024 >= maxSizeMB) return `PDF文件大小不能超过${maxSizeMB}MB!`;
  return null;
}

// 把上传过程中的各种错误转成给用户看的提示
export function uploadErrorMessage(error) {
  const message = (error && error.message) || '';
  if (message.includes('413')) return '文件太大，超出服务器允许的大小限制。请尝试上传更小的文件（小于20MB）。';
  if (message.includes('获取上传授权')) return message;
  if (message.includes('上传失败')) return '上传到腾讯云失败: ' + message;
  if (message.includes('缺少必要字段')) return '服务器返回数据错误: ' + message;
  return '文件上传失败: ' + (message || '未知错误') + '。请点击重试。';
}

// 本次编辑中新上传、但最终没有保存的文件（需要从云存储清理）：fileID 不等于原有文件的那些
export function orphanFileIDs(infos, originalFileIDs) {
  const originals = new Set((originalFileIDs || []).filter(Boolean));
  return [...new Set((infos || []).map((i) => i && i.fileID).filter((id) => id && !originals.has(id)))];
}

// 把预览/提交报告整理成"需要处理的问题"列表，供页面展示。
// fileNames：与 items 对应的文件名；skipped：本地整理时就被跳过的文件
export function describeProblems(report, fileNames = [], skipped = []) {
  const rows = [];
  const nameOf = (index) => fileNames[index] || '';
  skipped.forEach((entry) => rows.push({ type: '已跳过', fileName: entry.fileName, detail: entry.reason }));
  ((report && report.notFound) || []).forEach((e) =>
    rows.push({ type: '找不到产品', fileName: nameOf(e.index), detail: `没有名为「${e.name}」的产品${e.catalogId ? '（在该文件夹对应的目录内）' : ''}，请检查文件名是否与产品名一致` })
  );
  ((report && report.ambiguous) || []).forEach((e) =>
    rows.push({ type: '产品重名', fileName: nameOf(e.index), detail: `「${e.name}」在 ${e.candidates.length} 个目录里都有，请按目录名分文件夹放好，再用「选择文件夹」重新选择` })
  );
  ((report && report.conflicts) || []).forEach((e) =>
    rows.push({ type: '重复指向', fileName: nameOf(e.index), detail: `与其它文件对应同一个产品（产品 ID ${e.productId}）` })
  );
  ((report && report.invalid) || []).forEach((e) =>
    rows.push({ type: '无效', fileName: nameOf(e.index), detail: e.reason })
  );
  return rows;
}

// 提交后没有关联到任何产品的已上传文件 ID（需要从云存储清理）：
// 报告里没匹配上的条目对应的文件，加上本地就被跳过但已经上传了的文件
export function unmatchedFileIDs(report, items = [], skipped = []) {
  const ids = new Set();
  ['notFound', 'ambiguous', 'conflicts', 'invalid'].forEach((key) => {
    ((report && report[key]) || []).forEach((e) => {
      const item = items[e.index];
      if (item && item.fileIDEn) ids.add(item.fileIDEn);
    });
  });
  skipped.forEach((entry) => entry.fileID && ids.add(entry.fileID));
  return [...ids];
}

// 文件选择列表的汇总：各状态的数量
export function summarizeRows(rows) {
  const out = { total: 0, pending: 0, uploading: 0, done: 0, error: 0, unparsable: 0 };
  (rows || []).forEach((row) => {
    out.total++;
    if (row.parseError) out.unparsable++;
    else out[row.status] = (out[row.status] || 0) + 1;
  });
  return out;
}
