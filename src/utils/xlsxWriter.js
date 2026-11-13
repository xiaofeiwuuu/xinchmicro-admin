// 最小的 .xlsx 生成器（不依赖第三方库）：只做发货单需要的——多个工作表、合并单元格、列宽行高、字体/边框/对齐、公式、纸张和页边距。
// .xlsx 就是一个 zip，里面是几个 XML；zip 这里只做「存储」（不压缩），自己算 CRC32。
//
// 用法：buildXlsx([{ name, colWidths: { A: 10 }, rowHeights: { 1: 40 }, defaultRowHeight, defaultColWidth, horizontalCentered, merges: ['A1:H1'], cells: [{ r: 'A1', v: '文字或数字', s: 样式号, f: 'SUM(E5:E6)' }], margins: {...}, paperSize: 9 }]) → Uint8Array
// 样式号见下面 STYLES（和发货单模板里的字体、边框、对齐一致）

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

// ---- 样式：字体、边框、对齐 ----
const FONTS = [
	{ name: '宋体', sz: 11 }, // 0 默认
	{ name: '宋体', sz: 16, b: true }, // 1 标题
	{ name: '宋体', sz: 10 }, // 2 小字
	{ name: 'Times New Roman', sz: 11 } // 3 数字和型号
]
export const STYLES = {
	default: 0,
	title: 1, // 宋体 16 粗体，居中，自动换行
	label: 2, // 宋体 10，靠左，垂直居中
	labelWrap: 3, // 同上，自动换行（收货地址）
	head: 4, // 表头：宋体 11，居中，四周边框
	cell: 5, // 表格里的文字：宋体 11，居中，四周边框
	num: 6, // 表格里的数字、型号：Times New Roman 11，居中，四周边框
	note: 7, // 注意事项：宋体 11，靠左
	signCenter: 8 // 收货日期：宋体 11，居中
}
// [fontId, borderId, horizontal, wrap]
const XFS = [
	[0, 0, null, false], // 0
	[1, 0, 'center', true], // 1 title
	[2, 0, 'left', false], // 2 label
	[2, 0, 'left', true], // 3 labelWrap
	[0, 1, 'center', false], // 4 head
	[0, 1, 'center', false], // 5 cell
	[3, 1, 'center', false], // 6 num
	[0, 0, 'left', false], // 7 note
	[0, 0, 'center', false] // 8 signCenter
]

const stylesXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${FONTS.length}">${FONTS.map((f) => `<font>${f.b ? '<b/>' : ''}<sz val="${f.sz}"/><name val="${f.name}"/><family val="${f.name === '宋体' ? 3 : 1}"/>${f.name === '宋体' ? '<charset val="134"/>' : ''}</font>`).join('')}</fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${XFS.length}">${XFS.map(([font, border, h, wrap]) => `<xf numFmtId="0" fontId="${font}" fillId="0" borderId="${border}" xfId="0" applyFont="1"${border ? ' applyBorder="1"' : ''} applyAlignment="1"><alignment${h ? ` horizontal="${h}"` : ''} vertical="center"${wrap ? ' wrapText="1"' : ''}/></xf>`).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="常规" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

// ---- 工作表 ----
const colNumber = (letters) => letters.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0)
const splitRef = (ref) => { const m = /^([A-Z]+)(\d+)$/.exec(ref); return { col: colNumber(m[1]), row: Number(m[2]) } }

function sheetXml(sheet) {
	const byRow = new Map()
	;(sheet.cells || []).forEach((c) => {
		const { row, col } = splitRef(c.r)
		if (!byRow.has(row)) byRow.set(row, [])
		byRow.get(row).push({ ...c, col })
	})
	const heights = sheet.rowHeights || {}
	const rowNums = [...new Set([...byRow.keys(), ...Object.keys(heights).map(Number)])].sort((a, b) => a - b)
	const rows = rowNums.map((n) => {
		const cells = (byRow.get(n) || []).sort((a, b) => a.col - b.col).map((c) => {
			const s = c.s ? ` s="${c.s}"` : ''
			if (c.f) return `<c r="${c.r}"${s}><f>${esc(c.f)}</f>${c.v !== undefined ? `<v>${esc(c.v)}</v>` : ''}</c>`
			if (c.v === undefined || c.v === null || c.v === '') return `<c r="${c.r}"${s}/>`
			if (typeof c.v === 'number') return `<c r="${c.r}"${s}><v>${c.v}</v></c>`
			return `<c r="${c.r}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`
		}).join('')
		return `<row r="${n}"${heights[n] ? ` ht="${heights[n]}" customHeight="1"` : ''}>${cells}</row>`
	}).join('')
	const cols = Object.entries(sheet.colWidths || {}).sort((a, b) => colNumber(a[0]) - colNumber(b[0]))
		.map(([letters, w]) => `<col min="${colNumber(letters)}" max="${colNumber(letters)}" width="${w}" customWidth="1"/>`).join('')
	const m = { left: 0.15625, right: 0.15625, top: 0.275, bottom: 1, header: 0.3, footer: 0.3, ...(sheet.margins || {}) }
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="${sheet.defaultRowHeight || 15}"${sheet.defaultColWidth ? ` defaultColWidth="${sheet.defaultColWidth}"` : ''}/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${rows}</sheetData>${(sheet.merges || []).length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((r) => `<mergeCell ref="${r}"/>`).join('')}</mergeCells>` : ''}${sheet.horizontalCentered ? '<printOptions horizontalCentered="1"/>' : ''}<pageMargins left="${m.left}" right="${m.right}" top="${m.top}" bottom="${m.bottom}" header="${m.header}" footer="${m.footer}"/><pageSetup paperSize="${sheet.paperSize || 9}" orientation="portrait"/></worksheet>`
}

// 工作表名：最长 31 个字符，不能有 \ / ? * [ ] :，不能重名
function sheetNames(sheets) {
	const used = new Set()
	return sheets.map((s, i) => {
		let name = String(s.name || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || `Sheet${i + 1}`
		let k = 2
		while (used.has(name.toLowerCase())) name = `${name.slice(0, 28)}-${k++}`
		used.add(name.toLowerCase())
		return name
	})
}

// ---- zip（只存储，不压缩）----
let crcTable = null
function crc32(bytes) {
	if (!crcTable) {
		crcTable = new Uint32Array(256)
		for (let n = 0; n < 256; n++) {
			let c = n
			for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
			crcTable[n] = c >>> 0
		}
	}
	let crc = 0xffffffff
	for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
	return (crc ^ 0xffffffff) >>> 0
}

function zip(files) {
	const enc = new TextEncoder()
	const chunks = []
	const central = []
	let offset = 0
	const u16 = (n) => [n & 255, (n >>> 8) & 255]
	const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]
	files.forEach(({ name, data }) => {
		const nameBytes = enc.encode(name)
		const bytes = typeof data === 'string' ? enc.encode(data) : data
		const crc = crc32(bytes)
		const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(bytes.length), ...u32(bytes.length), ...u16(nameBytes.length), ...u16(0), ...nameBytes])
		chunks.push(local, bytes)
		central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(bytes.length), ...u32(bytes.length), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameBytes]))
		offset += local.length + bytes.length
	})
	const centralSize = central.reduce((n, c) => n + c.length, 0)
	const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)])
	const all = [...chunks, ...central, end]
	const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0))
	let pos = 0
	all.forEach((c) => { out.set(c, pos); pos += c.length })
	return out
}

export function buildXlsx(sheets) {
	const names = sheetNames(sheets)
	const files = [
		{ name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
		{ name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
		{ name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
		{ name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
		{ name: 'xl/styles.xml', data: stylesXml() },
		...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }))
	]
	return zip(files)
}
