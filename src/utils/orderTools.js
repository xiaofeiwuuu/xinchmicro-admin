// 订单导出（CSV，Excel 能直接打开）、发货单打印。都是纯函数，页面只管取数据和触发。
import { toCsv, ORDER_STATUS, INVOICE_STATUS, money } from '@/utils/shop'
import { buildXlsx, STYLES as S } from '@/utils/xlsxWriter'

export const EXPORT_HEADERS = ['订单号', '下单时间', '付款时间', '订单状态', '客户', '客户手机', '收货人', '收货电话', '收货地址', '商品明细', '金额', '快递公司', '运单号', '开票状态', '客户备注', '取消原因']

// 一行一个订单。商品明细写成「名称×数量；名称×数量」，放在一个单元格里，方便财务和仓库一眼看
export function orderRow(o) {
	const items = (o.items || []).map((i) => `${i.name}×${i.qty}`).join('；')
	return [
		o.orderNo, o.createdAt || '', o.paidAt || '', (ORDER_STATUS[o.status] || {}).text || o.status,
		(o.customer && o.customer.nickname) || '', (o.customer && o.customer.phone) || '',
		o.address.consignee, o.address.phone, `${o.address.region} ${o.address.detail}`.replace(/\n/g, ' '),
		items, Number(o.totalAmount).toFixed(2), o.expressCompany || '', o.expressNo || '',
		(INVOICE_STATUS[o.invoiceStatus] || {}).text || '', o.remark || '', o.cancelReason || ''
	]
}

export const ordersCsv = (orders) => toCsv([EXPORT_HEADERS, ...orders.map(orderRow)])

// 批量发货的模板
export const BULK_SHIP_HEADERS = ['订单号', '快递公司', '运单号']
export const bulkShipTemplate = () => toCsv([BULK_SHIP_HEADERS, ['XC20260101123456', '顺丰速运', 'SF1234567890']])

// 下载一个文本文件（浏览器里）
export function downloadText(text, filename, type = 'text/csv;charset=utf-8') {
	const a = document.createElement('a')
	a.href = URL.createObjectURL(new Blob([text], { type }))
	a.download = filename
	a.click()
	URL.revokeObjectURL(a.href)
}

const esc = (v) => String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// ---------- 发货单 ----------
// 版式照财务给的「送货单」表格（浩翼创想--送货单….xlsx）：一个订单一页（HTML 打印）/ 一个工作表（xlsx 导出）。
// 内容全部转义（客户的备注、收货地址是用户输入）。
// 对应关系：产品名称 = 产品所在的目录名；规格型号 = 产品名称；单位固定「只」；合同编号、检验批号、备注由打印前的窗口填（item.contractNo / batchNo / remark），不填就留空手写；
// 单号 = 订单号；出库日期 = 打印/导出当天。客户名称 = 开票抬头里的企业名称（没有就用收货人姓名）。
// 标题里的公司全称、单位是固定的；库房、发货人、复核由打印前的小窗口填（staff 参数），不填就留空手写
const DELIVERY = {
	title: '厦门芯辰微电子有限公司发货单',
	unit: '只'
}
const pad = (n) => String(n).padStart(2, '0')
const todayText = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
// 客户名称：开了发票的企业用企业名称；个人或没开票就用收货人姓名
const customerNameOf = (o) => (o.invoice && o.invoice.kind !== 'personal' && o.invoice.title) || (o.address && o.address.consignee) || ''
const oneLine = (s) => String(s === null || s === undefined ? '' : s).replace(/\s*\n\s*/g, ' ').trim()

// 一张发货单要写的内容（HTML 和 xlsx 共用）
function noteOf(o, date) {
	const a = o.address || {}
	const items = (o.items || []).map((i) => ({
		catalog: i.catalogName || '',
		spec: i.name || '',
		qty: Number(i.qty) || 0,
		contractNo: oneLine(i.contractNo),
		batchNo: oneLine(i.batchNo),
		remark: oneLine(i.remark)
	}))
	return {
		orderNo: o.orderNo,
		date,
		customer: customerNameOf(o),
		address: oneLine(`${a.region || ''}${a.detail ? ' ' + a.detail : ''}`),
		contact: `${a.consignee || ''}  ${a.phone || ''}`.trim(),
		items,
		total: items.reduce((n, i) => n + i.qty, 0)
	}
}

// 四联：财务、库房、客户回执、客户留存。
// copies = 1：打一份，底部照表格写「第三联：客户回执　第四联：客户留存」——用针式打印机 + 四联复写纸时，一次打出四层，都是这一页的内容；
// copies = 4：每个订单打四页（普通 A4 纸），每页底部只写自己是第几联
const COPY_NAMES = ['财务联', '库房联', '客户回执', '客户留存']

export function deliveryNotesHtml(orders, staff = {}, copies = 1) {
	const date = todayText()
	const page = (o, copyIndex = null) => {
		const n = noteOf(o, date)
		const rows = n.items.map((i, k) => `<tr class="item"><td class="num">${k + 1}</td><td>${esc(i.catalog)}</td><td class="num">${esc(i.spec)}</td><td>${esc(DELIVERY.unit)}</td><td class="num">${i.qty}</td><td class="num">${esc(i.contractNo)}</td><td class="num">${esc(i.batchNo)}</td><td>${esc(i.remark)}</td></tr>`).join('')
		return `
<section class="page">
	<h1>${esc(DELIVERY.title)}</h1>
	<div class="row"><span class="lab">客户名称：</span><span class="val">${esc(n.customer)}</span><span class="right">单号：${esc(n.orderNo)}</span></div>
	<div class="row"><span class="lab">收货联系人：</span><span class="val">${esc(n.address)}<span class="nb">　${esc(n.contact)}</span></span><span class="right">出库日期：${n.date}</span></div>
	<table class="grid">
		<colgroup><col style="width:9.8%"><col style="width:11.4%"><col style="width:20.2%"><col style="width:6%"><col style="width:8.3%"><col style="width:24.2%"><col style="width:9.9%"><col style="width:10.2%"></colgroup>
		<thead><tr class="head"><td>序号</td><td>产品名称</td><td>规格型号</td><td>单位</td><td>数量</td><td>合同编号</td><td>检验批号</td><td>备注</td></tr></thead>
		<tbody>
		${rows}
		<tr class="item"><td></td><td>以下无</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
		<tr class="item"><td></td><td>合　　计</td><td></td><td></td><td class="num">${n.total}</td><td></td><td></td><td></td></tr>
		</tbody>
	</table>
	<div class="note">注：1.请收到货后认真核对型号、数量以及其他项目，如有疑问，请及时与我们联系，谢谢！</div>
	<div class="note">　　2.请确认无误后，签字并回传。</div>
	<div class="staff">库房：<span class="nm">${esc(staff.warehouse || '')}</span>发货人：<span class="nm">${esc(staff.sender || '')}</span>复核：<span class="nm">${esc(staff.checker || '')}</span>${copyIndex === null ? '第三联：客户回执　　　　　第四联：客户留存' : `<b class="copy">第${'一二三四'[copyIndex]}联：${COPY_NAMES[copyIndex]}</b>`}</div>
	<div class="sign1"><span class="lab">收货单位：</span>${esc(n.customer)}</div>
	<div class="sign2"><span class="lab">收货人签字：</span><span class="date">收货日期：</span></div>
</section>`
	}
	return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>发货单</title><style>
		body { margin: 0; font: 13.5px/1.5 SimSun, "Songti SC", STSong, serif; color: #000; }
		.page { box-sizing: border-box; width: 202mm; margin: 0 auto; padding: 7mm 0 0; page-break-after: always; }
		.page:last-child { page-break-after: auto; }
		h1 { margin: 0 0 3mm; text-align: center; font-size: 21px; font-weight: 700; line-height: 14mm; }
		.row { display: flex; align-items: center; min-height: 7.4mm; }
		.row .lab { flex: none; }
		.row .val { flex: 1; min-width: 0; }
		.row .right { flex: none; width: 36%; }
		.row .nb { white-space: nowrap; }
		.grid { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 1mm; font-size: 14px; }
		.grid td { border: 1px solid #000; text-align: center; vertical-align: middle; padding: 0 3px; word-break: break-all; height: 7.8mm; }
		.grid tr.item td { height: 8mm; }
		.grid tr.head td { font-size: 14.5px; }
		.grid .num { font-family: "Times New Roman", Times, serif; font-size: 15px; }
		.note { margin-top: 1.5mm; min-height: 7mm; line-height: 7mm; font-size: 14px; }
		.staff { margin-top: 1mm; min-height: 7mm; line-height: 7mm; }
		.staff .copy { margin-left: 6mm; font-weight: 700; }
		.staff .nm { display: inline-block; min-width: 20mm; margin-right: 4mm; } /* 不填时留出手写的位置 */
		.sign1 { margin-top: 4mm; min-height: 8.5mm; line-height: 8.5mm; }
		.sign2 { display: flex; min-height: 7.4mm; line-height: 7.4mm; font-size: 14px; }
		.sign2 .lab { width: 36%; }
		.sign2 .date { margin-left: 4%; }
		/* 不写死纸张尺寸：用打印窗口里选的纸（A4、针式打印机的连续纸都行）；页边距 0，页眉页脚也就不会被浏览器加上。
		   产品行多、一页放不下时，表头每页重复，一行不会被拆开 */
		.grid thead { display: table-header-group; }
		.grid tr { page-break-inside: avoid; }
		@media print { @page { margin: 0; } }
	</style></head><body>${orders.map((o) => (Number(copies) === 4 ? [0, 1, 2, 3].map((k) => page(o, k)).join('') : page(o))).join('')}</body></html>`
}

// 导出成 .xlsx：版式和财务给的送货单表格一致（列宽、行高、字体、边框、合并单元格），一个订单一个工作表（工作表名 = 订单号）。
// 返回文件内容（Uint8Array）。库房/发货人/复核没填就是空的
export function deliveryXlsx(orders, staff = {}) {
	const date = todayText()
	const sheets = orders.map((o) => {
		const n = noteOf(o, date)
		const cells = []
		const rowHeights = { 1: 40, 2: 21, 3: 21, 4: 22 }
		const put = (r, v, s, f) => cells.push({ r, v, s, ...(f ? { f } : {}) })
		const merges = ['A1:H1', 'B2:F2', 'G2:H2', 'B3:F3', 'G3:H3']
		// 表头区
		put('A1', DELIVERY.title, S.title)
		put('A2', '客户名称：', S.label); put('B2', n.customer, S.label); put('G2', `单号：${n.orderNo}`, S.label)
		put('A3', '收货联系人：', S.label); put('B3', `${n.address}  ${n.contact}`, S.labelWrap); put('G3', `出库日期：${n.date}`, S.label)
		;['序号', '产品名称', '规格型号', '单位', '数量', '合同编号', '检验批号', '备注'].forEach((h, k) => put(`${'ABCDEFGH'[k]}4`, h, S.head))
		// 明细
		let r = 5
		n.items.forEach((i, k) => {
			rowHeights[r] = 22
			put(`A${r}`, k + 1, S.num); put(`B${r}`, i.catalog, S.cell); put(`C${r}`, i.spec, S.num); put(`D${r}`, DELIVERY.unit, S.num)
			put(`E${r}`, i.qty, S.num); put(`F${r}`, i.contractNo, S.num); put(`G${r}`, i.batchNo, S.num); put(`H${r}`, i.remark, S.cell)
			r++
		})
		// 以下无、合计（合计用公式，和模板一样）
		const first = 5
		rowHeights[r] = 22
		put(`A${r}`, '', S.cell); put(`B${r}`, '以下无', S.cell)
		;['C', 'D', 'E', 'F', 'G', 'H'].forEach((c) => put(`${c}${r}`, '', S.cell))
		r++
		rowHeights[r] = 22
		put(`A${r}`, '', S.cell); put(`B${r}`, '合    计', S.cell); put(`C${r}`, '', S.cell); put(`D${r}`, '', S.cell)
		put(`E${r}`, n.total, S.num, `SUM(E${first}:E${r - 1})`)
		;['F', 'G', 'H'].forEach((c) => put(`${c}${r}`, '', S.cell))
		r++
		// 注意事项、经手人、收货信息
		rowHeights[r] = 21; put(`A${r}`, '注：1.请收到货后认真核对型号、数量以及其他项目，如有疑问，请及时与我们联系，谢谢！', S.note); r++
		rowHeights[r] = 21; put(`A${r}`, '    2.请确认无误后，签字并回传。', S.note); r++
		rowHeights[r] = 15
		put(`A${r}`, `库房：${staff.warehouse || ''}          发货人：${staff.sender || ''}          复核：${staff.checker || ''}          第三联：客户回执          第四联：客户留存`, S.label)
		merges.push(`A${r}:H${r}`); r++
		rowHeights[r] = 25; put(`A${r}`, '收货单位：', S.label); put(`B${r}`, n.customer, S.label); r++
		rowHeights[r] = 21; put(`A${r}`, '收货人签字：', S.note); put(`F${r}`, '收货日期：', S.signCenter)
		rowHeights[r + 1] = 30 // 模板最后还有一行空行（高 30）
		// 列宽、默认行高、水平居中打印都和送货单模板一致（E 列用默认列宽 8.725）
		return { name: n.orderNo, cells, merges, rowHeights, colWidths: { A: 10.125, B: 11.625, C: 20.625, D: 6.125, E: 8.725, F: 24.625, G: 10.125, H: 10.625, I: 15.183 }, defaultRowHeight: 13.5, defaultColWidth: 8.725, horizontalCentered: true, paperSize: 9 }
	})
	return buildXlsx(sheets)
}

export function downloadBytes(bytes, filename, type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
	const a = document.createElement('a')
	a.href = URL.createObjectURL(new Blob([bytes], { type }))
	a.download = filename
	a.click()
	URL.revokeObjectURL(a.href)
}

// 打开新窗口并打印。先同步开窗口（异步之后再开会被浏览器当成弹窗拦截），内容写好后调打印
export function openPrint(html) {
	const w = window.open('', '_blank')
	if (!w) return false
	w.document.open()
	w.document.write(html)
	w.document.close()
	w.focus()
	setTimeout(() => w.print(), 300)
	return true
}
