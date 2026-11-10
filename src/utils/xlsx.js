// 读 .xlsx（只读第一个工作表，返回 [[单元格文字, ...], ...]），不依赖第三方库。
// xlsx 本质是 zip：里面有 xl/workbook.xml、xl/sharedStrings.xml、xl/worksheets/sheetN.xml。
// 这里手写了够用的最小实现：zip 目录 + 用浏览器自带的 DecompressionStream 解压 + 正则取单元格。
// 只认「值」：公式取缓存的结果，日期不转换（导入价格库存用不到），合并单元格不展开。
// 老的 .xls（二进制）不支持，让用户另存为 .xlsx 或 CSV。

const MAX_ENTRY = 30 * 1024 * 1024; // 单个文件解压后最大 30MB，防压缩炸弹

const u16 = (v, o) => v.getUint16(o, true);
const u32 = (v, o) => v.getUint32(o, true);
const decoder = new TextDecoder('utf-8');

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持直接读取 xlsx，请在 Excel 里另存为 CSV 再导入');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const buf = await new Response(stream).arrayBuffer();
  if (buf.byteLength > MAX_ENTRY) throw new Error('表格内容太大');
  return new Uint8Array(buf);
}

// 读 zip 的中央目录：{ 文件名: { method, csize, usize, offset } }
function readZipDirectory(buffer) {
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 22 - 65535); i--) {
    if (u32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('不是有效的 xlsx 文件（请确认是 .xlsx，不是老的 .xls）');
  const count = u16(view, eocd + 10);
  let p = u32(view, eocd + 16);
  const entries = {};
  for (let n = 0; n < count; n++) {
    if (p + 46 > buffer.byteLength || u32(view, p) !== 0x02014b50) throw new Error('xlsx 文件已损坏');
    const nameLen = u16(view, p + 28);
    const extraLen = u16(view, p + 30);
    const commentLen = u16(view, p + 32);
    const name = decoder.decode(new Uint8Array(buffer, p + 46, nameLen));
    entries[name] = { method: u16(view, p + 10), csize: u32(view, p + 20), usize: u32(view, p + 24), offset: u32(view, p + 42) };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(buffer, entry) {
  const view = new DataView(buffer);
  const o = entry.offset;
  if (u32(view, o) !== 0x04034b50) throw new Error('xlsx 文件已损坏');
  const start = o + 30 + u16(view, o + 26) + u16(view, o + 28);
  const data = new Uint8Array(buffer, start, entry.csize);
  if (entry.usize > MAX_ENTRY) throw new Error('表格内容太大');
  if (entry.method === 0) return decoder.decode(data);
  if (entry.method === 8) return decoder.decode(await inflateRaw(data));
  throw new Error('不支持的 xlsx 压缩方式');
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unescapeXml = (s) =>
  s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e];
  });

// <si> 里所有 <t> 拼起来（富文本会分成好几段；拼音注释 <rPh> 不要）
function textOf(xml) {
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let out = '';
  clean.replace(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g, (m, t) => {
    out += unescapeXml(t || '');
    return m;
  });
  return out;
}

const colIndex = (letters) => letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
const attr = (attrs, name) => {
  const m = attrs.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return m ? m[1] : '';
};

// Excel 会把输入的 8.3 存成 8.3000000000000007 这样的 17 位小数：取 15 位有效数字还原
const numberText = (raw) => {
  const n = Number(raw);
  return Number.isFinite(n) ? String(Number(n.toPrecision(15))) : raw;
};

export async function readXlsx(buffer) {
  const entries = readZipDirectory(buffer);
  const get = async (name) => (entries[name] ? readEntry(buffer, entries[name]) : '');

  // 第一个工作表的路径：workbook.xml 里第一个 <sheet> 的 r:id → workbook.xml.rels 里的 Target；找不到就用 sheet1.xml
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = await get('xl/workbook.xml');
  const rels = await get('xl/_rels/workbook.xml.rels');
  const first = wb.match(/<sheet\b[^>]*>/);
  if (first) {
    const rid = attr(first[0], 'r:id');
    const rel = rid && (rels.match(/<Relationship\b[^>]*>/g) || []).find((r) => attr(r, 'Id') === rid);
    const target = rel && attr(rel, 'Target');
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
  }
  if (!entries[sheetPath]) throw new Error('xlsx 里没有找到工作表');

  const shared = [];
  const sst = await get('xl/sharedStrings.xml');
  (sst.match(/<si\b[\s\S]*?<\/si>|<si\s*\/>/g) || []).forEach((si) => shared.push(textOf(si)));

  const sheet = await get(sheetPath);
  const rows = [];
  (sheet.match(/<row\b[\s\S]*?<\/row>/g) || []).forEach((rowXml) => {
    const cells = [];
    rowXml.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (m, attrs, inner = '') => {
      const ref = attr(attrs, 'r').match(/^([A-Z]+)/);
      if (!ref) return m;
      const type = attr(attrs, 't');
      const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let value = '';
      if (type === 's') value = v === undefined ? '' : shared[Number(v)] || '';
      else if (type === 'inlineStr') value = textOf(inner);
      else if (type === 'str') value = unescapeXml(v || '');
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (type === 'e') value = '';
      else value = v === undefined ? '' : numberText(unescapeXml(v));
      cells[colIndex(ref[1])] = value;
      return m;
    });
    // 稀疏的（中间有没填的列）补成空串，行尾的空单元格去掉
    const dense = Array.from(cells, (c) => (c === undefined ? '' : c));
    while (dense.length && dense[dense.length - 1] === '') dense.pop();
    if (dense.some((c) => c !== '')) rows.push(dense);
  });
  return rows;
}
