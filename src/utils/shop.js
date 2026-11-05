// 商城后台共用的文案和颜色
export const ORDER_STATUS = {
	pending_payment: { text: '待付款', color: 'orange' },
	pending_ship: { text: '待发货', color: 'cyan' },
	shipped: { text: '已发货', color: 'green' },
	completed: { text: '已完成', color: 'green' },
	cancelled: { text: '已取消', color: '' }
}

// 已取消且付过款的订单的退款情况。订单状态始终是「已取消」，退款是单独的一件事，所以单独显示
export const REFUND_STATE = {
	pending: { text: '需要退款', color: 'red' },
	processing: { text: '退款中', color: 'blue' },
	failed: { text: '退款失败', color: 'red' },
	refunded: { text: '已退款', color: 'green' }
}

export const INVOICE_STATUS = {
	none: { text: '未开票', color: '' },
	requesting: { text: '开票中', color: 'blue' },
	issued: { text: '已开票', color: 'green' }
}

// 售后（发货后的退款、退货退款、换货）
export const AFTER_SALE_TYPE = { refund: '仅退款', return_refund: '退货退款', exchange: '换货' }
export const AFTER_SALE_STATUS = {
	requested: { text: '待审核', short: '待审核', color: 'orange' },
	approved: { text: '已同意，等客户寄回', short: '待寄回', color: 'blue' },
	returning: { text: '客户已寄回，待确认', short: '待收货', color: 'orange' },
	refunding: { text: '退款中', short: '退款中', color: 'blue' },
	refund_failed: { text: '退款失败', short: '退款失败', color: 'red' },
	refunded: { text: '已退款', short: '已退款', color: 'green' },
	completed: { text: '已换货', short: '已换货', color: 'green' },
	rejected: { text: '已拒绝', short: '已拒绝', color: '' },
	cancelled: { text: '客户已撤销', short: '已撤销', color: '' }
}
// 微信那边这笔售后退款现在的状态
export const AFTER_SALE_REFUND_STATE = { processing: '微信处理中', success: '微信退款成功', failed: '微信退款失败' }

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
	invoice_file: '上传发票文件',
	invoice_withdraw: '开票申请已撤销',
	invoice_reject: '驳回开票申请',
	wechat_paid: '微信支付成功',
	paid_but_not_payable: '订单已不能收款，但微信支付收了款（会自动退款）',
	refund_requested: '已向微信申请退款',
	refund_failed: '自动退款失败（超过 3 次需要人工在微信商户平台处理）',
	refund_done: '已手动退款',
	wechat_refunded: '微信退款成功',
	auto_receive: '发货超过期限，系统自动确认收货',
	after_sales_apply: '客户申请售后',
	after_sales_approve: '同意售后',
	after_sales_reject: '拒绝售后',
	after_sales_cancel: '客户撤销售后',
	after_sales_return: '客户寄回商品',
	after_sales_refund: '售后退款（已向微信申请）',
	after_sales_refunded: '售后退款已到账',
	after_sales_exchange: '换货已寄出'
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
