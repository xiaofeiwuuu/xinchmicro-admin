// 商城后台共用的文案和颜色
export const ORDER_STATUS = {
	pending_payment: { text: '待付款', color: 'orange' },
	pending_ship: { text: '待发货', color: 'cyan' },
	shipped: { text: '已发货', color: 'green' },
	completed: { text: '已完成', color: 'green' },
	cancelled: { text: '已取消', color: '' }
}

export const INVOICE_STATUS = {
	none: { text: '未开票', color: '' },
	requesting: { text: '开票中', color: 'blue' },
	issued: { text: '已开票', color: 'green' }
}

export const INVOICE_TYPE = { normal: '增值税普通发票', special: '增值税专用发票' }
export const PAID_BY = { wechat: '微信支付' }

// 订单操作记录里的动作名
export const LOG_ACTION = {
	create: '客户下单',
	cancel: '取消订单',
	expire: '超时未支付，系统自动取消',
	ship: '发货',
	receive: '确认收货',
	invoice_apply: '申请开票',
	invoice_issue: '开具发票',
	invoice_reject: '驳回开票申请',
	wechat_paid: '微信支付成功',
	paid_but_not_payable: '订单已不能收款，但微信支付收了款（会自动退款）',
	refund_requested: '已向微信申请退款',
	refund_failed: '自动退款失败（超过 3 次需要人工在微信商户平台处理）',
	refund_done: '已手动退款',
	wechat_refunded: '微信退款成功'
}

export const ACTOR = { customer: '客户', admin: '后台', system: '系统' }

export const money = (v) => `¥${Number(v || 0).toFixed(2)}`

// 导出 CSV（带 BOM，Excel 打开中文不乱码）。cell 里有逗号、引号、换行时按规范加引号
export function toCsv(rows) {
	const esc = (v) => {
		const s = v === null || v === undefined ? '' : String(v)
		return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
	}
	return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
}

// 解析 CSV（支持引号、引号里的逗号和换行、BOM）
export function parseCsv(text) {
	const src = String(text).replace(/^﻿/, '')
	const rows = []
	let row = []
	let cell = ''
	let quoted = false
	for (let i = 0; i < src.length; i++) {
		const c = src[i]
		if (quoted) {
			if (c === '"' && src[i + 1] === '"') { cell += '"'; i++ }
			else if (c === '"') quoted = false
			else cell += c
		} else if (c === '"') quoted = true
		else if (c === ',') { row.push(cell); cell = '' }
		else if (c === '\n' || c === '\r') {
			if (c === '\r' && src[i + 1] === '\n') i++
			row.push(cell); cell = ''
			if (row.some((x) => x !== '')) rows.push(row)
			row = []
		} else cell += c
	}
	row.push(cell)
	if (row.some((x) => x !== '')) rows.push(row)
	return rows
}
