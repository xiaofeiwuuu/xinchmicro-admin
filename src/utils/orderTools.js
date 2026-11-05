// 订单导出（CSV，Excel 能直接打开）、发货单打印。都是纯函数，页面只管取数据和触发。
import { toCsv, ORDER_STATUS, INVOICE_STATUS, money } from '@/utils/shop'

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

// 发货单：一个订单一页，A4。内容全部转义（客户的备注、收货地址是用户输入）
export function deliveryNotesHtml(orders, companyName = '') {
	const page = (o) => `
<section class="page">
	<h1>发货单</h1>
	${companyName ? `<div class="co">${esc(companyName)}</div>` : ''}
	<table class="kv">
		<tr><td class="k">订单号</td><td>${esc(o.orderNo)}</td><td class="k">下单时间</td><td>${esc(o.createdAt)}</td></tr>
		<tr><td class="k">收货人</td><td>${esc(o.address.consignee)}　${esc(o.address.phone)}</td><td class="k">付款时间</td><td>${esc(o.paidAt || '未付款')}</td></tr>
		<tr><td class="k">收货地址</td><td colspan="3">${esc(`${o.address.region} ${o.address.detail}`).replace(/\n/g, '<br>')}</td></tr>
		${o.expressNo ? `<tr><td class="k">快递</td><td colspan="3">${esc(o.expressCompany)}　${esc(o.expressNo)}</td></tr>` : ''}
		${o.remark ? `<tr><td class="k">客户备注</td><td colspan="3">${esc(o.remark).replace(/\n/g, '<br>')}</td></tr>` : ''}
	</table>
	<table class="items">
		<tr><th>#</th><th>产品</th><th class="r">单价</th><th class="r">数量</th><th class="r">小计</th></tr>
		${(o.items || []).map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.name)}</td><td class="r">${money(i.price)}</td><td class="r">${esc(i.qty)}</td><td class="r">${money(i.subtotal)}</td></tr>`).join('')}
		<tr class="sum"><td colspan="4" class="r">合计</td><td class="r">${money(o.totalAmount)}</td></tr>
	</table>
	<div class="sign"><span>发货人：__________</span><span>拣货核对：__________</span><span>日期：__________</span></div>
</section>`
	return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>发货单</title><style>
		body { margin: 0; font: 14px/1.6 -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; color: #111; }
		.page { box-sizing: border-box; width: 190mm; margin: 0 auto; padding: 14mm 0; page-break-after: always; }
		.page:last-child { page-break-after: auto; }
		h1 { margin: 0 0 4px; text-align: center; font-size: 22px; letter-spacing: 6px; }
		.co { text-align: center; color: #555; margin-bottom: 10px; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
		.kv td { padding: 5px 8px; border: 1px solid #999; vertical-align: top; }
		.kv .k { width: 64px; background: #f3f3f3; color: #333; white-space: nowrap; }
		.items th, .items td { padding: 6px 8px; border: 1px solid #999; text-align: left; }
		.items th { background: #f3f3f3; }
		.r { text-align: right !important; }
		.sum td { font-weight: 700; }
		.sign { display: flex; justify-content: space-between; margin-top: 26px; color: #333; }
		@media print { @page { size: A4; margin: 0; } }
	</style></head><body>${orders.map(page).join('')}</body></html>`
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
