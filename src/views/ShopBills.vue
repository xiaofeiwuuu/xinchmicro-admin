<template>
	<div>
		<!-- 查询条件 -->
		<a-card :bordered="false" class="mb-24">
			<div class="bills-head">
				<a-radio-group v-model="kind" button-style="solid" @change="onKindChange">
					<a-radio-button value="trade">交易账单</a-radio-button>
					<a-radio-button value="fund">资金账单</a-radio-button>
				</a-radio-group>
				<date-range-quick v-model="dates" :quicks="QUICK" :disabledDate="disabledDate" :allowClear="false" :pickerWidth="260" @quick="load()" />
				<a-select v-if="kind === 'trade'" v-model="billType" style="width: 150px;">
					<a-select-option value="ALL">全部（含退款）</a-select-option>
					<a-select-option value="SUCCESS">只看收款</a-select-option>
					<a-select-option value="REFUND">只看退款</a-select-option>
				</a-select>
				<a-select v-else v-model="accountType" style="width: 150px;">
					<a-select-option value="BASIC">基本账户</a-select-option>
					<a-select-option value="OPERATION">运营账户</a-select-option>
					<a-select-option value="FEES">手续费账户</a-select-option>
				</a-select>
				<a-button type="primary" :loading="loading" @click="load()">查询</a-button>
				<a-button :loading="downloading" :disabled="!data" @click="download">下载账单文件</a-button>
			</div>
			<div class="bills-sub">
				<span class="sub-actions">
					<a :class="{ disabled: syncing }" @click="sync">{{ syncing ? '同步中…' : '同步到本地' }}</a>
					<a :class="{ disabled: !data || loading }" @click="data && load(true)">重新从微信取</a>
					<a @click="showHelp = !showHelp">{{ showHelp ? '收起说明' : '说明' }}</a>
				</span>
			</div>
			<ul v-show="showHelp" class="help">
				<li>取过的账单会存在我们自己的数据库里，下次直接读本地，不再向微信请求。</li>
				<li>系统每天上午 10:30 以后自动同步最近 3 天的账单，并对昨天的账单对账，有差异会在右上角通知你。</li>
				<li>「同步到本地」：把选中日期里本地还没有的账单取下来（交易账单「全部」和资金账单「基本账户」）。「重新从微信取」：不用本地的，强制重新取一遍。</li>
				<li>微信每天上午 10 点以后才有昨天的账单，只能查最近三个月，日期按北京时间。某天没有交易也没有退款，微信不会生成账单，会跳过。</li>
				<li>微信的接口一次只给一天，所以一次最多选 31 天，是一天一天取了再合并，选得越长越慢。</li>
			</ul>
		</a-card>

		<a-spin :spinning="loading">
			<template v-if="data">
				<!-- 汇总 -->
				<a-card :bordered="false" class="mb-24" :title="title">
					<div v-if="data.source" slot="extra" class="muted">{{ sourceText }}</div>
					<div class="sum-grid">
						<div v-for="s in summaryItems" :key="s.k" class="sum-item">
							<div class="sum-k">{{ s.k }}</div>
							<div class="sum-v">{{ s.v }}</div>
						</div>
						<div v-if="!summaryItems.length" class="muted">所选日期内没有交易，没有汇总数据</div>
					</div>
				</a-card>

				<!-- 对账：只有「全部」交易账单才有 -->
				<a-card v-if="data.reconcile" :bordered="false" class="mb-24" title="和我们自己的记录对账">
					<div slot="extra" class="note" style="margin: 0;">
						<template v-if="data.reconcile.ok"><i class="dot ok"></i>和微信账单完全一致</template>
						<template v-else><i class="dot warn"></i>有 {{ data.reconcile.items.length }} 处差异，请逐条核对</template>
					</div>
					<table class="rec-table">
						<colgroup><col class="c-name" /><col /><col /><col /><col /></colgroup>
						<thead><tr><th></th><th>收款笔数</th><th>收款金额</th><th>退款笔数</th><th>退款金额</th></tr></thead>
						<tbody>
							<tr><td>微信账单</td><td>{{ data.reconcile.bill.payCount }}</td><td>{{ yuan(data.reconcile.bill.payAmount) }}</td><td>{{ data.reconcile.bill.refundCount }}</td><td>{{ yuan(data.reconcile.bill.refundAmount) }}</td></tr>
							<tr><td>我们的记录</td><td>{{ data.reconcile.local.payCount }}</td><td>{{ yuan(data.reconcile.local.payAmount) }}</td><td>{{ data.reconcile.local.refundCount }}</td><td>{{ yuan(data.reconcile.local.refundAmount) }}</td></tr>
							<tr class="rec-diff"><td>差异</td><td v-for="(d, i) in recDiff" :key="i" :class="{ bad: d.bad }">{{ d.text }}</td></tr>
						</tbody>
					</table>
					<a-table v-if="!data.reconcile.ok" class="rec-items" size="small" rowKey="key" :columns="diffColumns" :dataSource="diffRows" :pagination="false">
						<template slot="type" slot-scope="text"><a-tag :color="DIFF[text].color">{{ DIFF[text].text }}</a-tag></template>
						<template slot="bill" slot-scope="text">{{ text === null ? '—' : yuan(text) }}</template>
						<template slot="localAmt" slot-scope="text">{{ text === null ? '—' : yuan(text) }}</template>
					</a-table>
					<div class="bills-tip" style="margin-top: 12px;">说明：付款时间接近 0 点的订单，微信和我们可能记在不同的日期，这种差异多半不是问题；对账只读，不会修改任何订单。</div>
				</a-card>

				<!-- 明细 -->
				<a-card :bordered="false" :title="'明细（' + data.count + ' 条）'">
					<a-table size="small" rowKey="key" :columns="columns" :dataSource="rows" :pagination="pagination" :scroll="{ x: true }" @change="onTableChange" />
					<div class="bills-tip" style="margin-top: 8px;">表里只列常用的几列；完整内容请点上面的「下载账单文件」。文件里每个字段前的 ` 字符是微信故意加的，防止 Excel 把长数字显示成科学计数法。</div>
				</a-card>
			</template>
			<a-card v-else-if="!loading" :bordered="false">
				<div v-if="error" class="note" style="margin: 0;"><i class="dot warn"></i>{{ error }}</div>
				<div v-else class="muted">选好日期，点「查询」。</div>
			</a-card>
		</a-spin>
	</div>
</template>

<script>
import moment from 'moment'
import 'moment/locale/zh-cn'
import DateRangeQuick from '@/components/DateRangeQuick.vue'
import { getWxBill, downloadWxBill, syncWxBills } from '@/api'
import { notifyError } from '@/utils/notify'
import { newPagination, applyTableChange } from '@/utils/pagination'

const DIFF = {
	pay_missing_local: { text: '微信有、我们没确认', color: 'red' },
	pay_missing_bill: { text: '我们有、微信没有', color: 'orange' },
	pay_amount: { text: '收款金额不一致', color: 'red' },
	refund_missing_local: { text: '微信有退款、我们没有', color: 'orange' },
	refund_missing_bill: { text: '我们有退款、微信没有', color: 'orange' },
	refund_amount: { text: '退款金额不一致', color: 'red' }
}
// 交易账单表里显示的列（完整内容在下载的文件里）
// 快捷日期：都到昨天为止（今天的账单还没有）
const yday = () => moment().startOf('day').subtract(1, 'day')
const QUICK = [
	{ key: 'yesterday', text: '昨天', range: () => [yday(), yday()] },
	{ key: '3d', text: '近 3 天', range: () => [yday().subtract(2, 'day'), yday()] },
	{ key: '7d', text: '近 7 天', range: () => [yday().subtract(6, 'day'), yday()] },
	{ key: '30d', text: '近 30 天', range: () => [yday().subtract(29, 'day'), yday()] }
]
const TRADE_COLS = ['交易时间', '商户订单号', '微信订单号', '交易状态', '订单金额', '申请退款金额', '手续费', '商品名称']

export default {
	components: { DateRangeQuick },
	data() {
		return {
			DIFF, QUICK,
			kind: 'trade', billType: 'ALL', accountType: 'BASIC',
			dates: [moment().subtract(1, 'day'), moment().subtract(1, 'day')],
			data: null, loading: false, downloading: false, syncing: false, showHelp: false, error: '', seq: 0,
			pagination: newPagination()
		}
	},
	created() {
		moment.locale('zh-cn')
		this.applyRoute()
	},
	watch: {
		// 从右上角「账单对账有差异」的通知点进来：直接看那一天
		'$route.query.n'() { this.applyRoute() }
	},
	computed: {
		query() {
			const [a, b] = this.dates || []
			const q = { kind: this.kind, from: a ? a.format('YYYY-MM-DD') : '', to: b ? b.format('YYYY-MM-DD') : '' }
			if (this.kind === 'trade') q.billType = this.billType
			else q.accountType = this.accountType
			return q
		},
		sourceText() {
			const sc = this.data && this.data.source
			if (!sc) return ''
			const parts = []
			if (sc.local) parts.push(`${sc.local} 天读本地`)
			if (sc.wechat) parts.push(`${sc.wechat} 天刚从微信取`)
			if (sc.syncedAt) parts.push('最早同步于 ' + moment(sc.syncedAt).format('MM-DD HH:mm'))
			return parts.join(' · ')
		},
		title() {
			const d = this.data
			const range = d && d.from && d.from !== d.to ? `${d.from} 至 ${d.to}（${d.days} 天）` : (d && d.from) || ''
			return `${this.kind === 'trade' ? '交易账单' : '资金账单'} · ${range}`
		},
		summaryItems() {
			const s = (this.data && this.data.summary) || {}
			return Object.keys(s).map((k) => ({ k, v: s[k] }))
		},
		columns() {
			if (!this.data) return []
			const header = this.data.header || []
			const cols = this.kind === 'trade' ? TRADE_COLS.filter((c) => header.includes(c)) : header
			return cols.map((c) => ({ title: c, dataIndex: c, key: c }))
		},
		rows() { return ((this.data && this.data.rows) || []).map((r, i) => ({ ...r, key: i })) },
		// 微信账单减我们的记录；一样就显示 —，不一样标橙色
		recDiff() {
			const r = this.data && this.data.reconcile
			if (!r) return []
			const f = (a, b, money) => {
				const d = Math.round((a - b) * 100) / 100
				return d === 0 ? { text: '—', bad: false } : { text: (d > 0 ? '+' : '') + (money ? '¥' + d.toFixed(2) : d), bad: true }
			}
			return [f(r.bill.payCount, r.local.payCount), f(r.bill.payAmount, r.local.payAmount, true), f(r.bill.refundCount, r.local.refundCount), f(r.bill.refundAmount, r.local.refundAmount, true)]
		},
		diffColumns() {
			return [
				{ title: '类型', dataIndex: 'type', key: 'type', scopedSlots: { customRender: 'type' } },
				{ title: '商户订单号/退款单号', dataIndex: 'outTradeNo', key: 'outTradeNo' },
				{ title: '业务订单号', dataIndex: 'orderNo', key: 'orderNo' },
				{ title: '微信账单金额', dataIndex: 'billAmount', key: 'billAmount', scopedSlots: { customRender: 'bill' } },
				{ title: '我们的金额', dataIndex: 'localAmount', key: 'localAmount', scopedSlots: { customRender: 'localAmt' } },
				{ title: '说明', dataIndex: 'note', key: 'note' }
			]
		},
		diffRows() { return ((this.data && this.data.reconcile && this.data.reconcile.items) || []).map((x, i) => ({ ...x, key: i })) }
	},
	methods: {
		yuan(n) { return '¥' + Number(n || 0).toFixed(2) },
		// 只能选昨天及以前、最近三个月内；一次最多 31 天（选了开始日期后，超过 31 天的选不了）
		disabledDate(current) {
			return !!current && (current.isAfter(moment().subtract(1, 'day').endOf('day')) || current.isBefore(moment().subtract(90, 'day').startOf('day')))
		},
		onKindChange() { this.data = null; this.error = '' },
		onTableChange(p) { applyTableChange(this.pagination, p) },
		applyRoute() {
			const d = this.$route && this.$route.query && this.$route.query.date
			if (d && moment(d, 'YYYY-MM-DD', true).isValid()) {
				this.kind = 'trade'
				this.billType = 'ALL'
				this.dates = [moment(d), moment(d)]
				this.$nextTick(() => this.load())
			}
		},
		// 把选中日期里本地还没有的账单取下来存好（交易账单全部 + 资金账单基本账户）
		async sync() {
			const { from, to } = this.query
			if (!from || !to) { this.$message.warning('请选择账单日期'); return }
			if (moment(to).diff(moment(from), 'days') + 1 > 31) { this.$message.warning('一次最多同步 31 天，请缩短日期范围'); return }
			this.syncing = true
			try {
				const r = await syncWxBills({ from, to })
				const one = (name, x) => `${name}：新取 ${x.synced} 天，本地已有 ${x.alreadyLocal} 天` + (x.none.length ? `，${x.none.length} 天没有交易` : '') + (x.pending.length ? `，${x.pending.length} 天还在生成（${x.pending.join('、')}）` : '')
				this.$info({ title: `同步完成（${r.from}${r.from === r.to ? '' : ' 至 ' + r.to}）`, content: this.$createElement('div', [this.$createElement('div', one('交易账单', r.trade)), this.$createElement('div', one('资金账单', r.fund))]), okText: '知道了' })
				if (this.data) this.load()
			} catch (error) {
				notifyError(this, error, '同步账单失败')
			} finally {
				this.syncing = false
			}
		},
		async load(refresh) {
			const { from, to } = this.query
			if (!from || !to) { this.$message.warning('请选择账单日期'); return }
			if (moment(to).diff(moment(from), 'days') + 1 > 31) { this.$message.warning('一次最多查 31 天，请缩短日期范围'); return }
			const seq = ++this.seq
			this.loading = true
			this.error = ''
			try {
				const res = await getWxBill(refresh === true ? { ...this.query, refresh: 1 } : this.query)
				if (seq !== this.seq) return
				this.data = res
				this.pagination = newPagination()
			} catch (error) {
				if (seq !== this.seq) return
				this.data = null
				// 没有账单、还在生成这类是正常情况，直接显示原因；请求层已经弹过提示的不再弹
				this.error = (error && error.message) || '获取账单失败'
				if (!(error && error.notified)) notifyError(this, error, '获取账单失败')
			} finally {
				if (seq === this.seq) this.loading = false
			}
		},
		async download() {
			this.downloading = true
			try {
				const blob = await downloadWxBill(this.query)
				const a = document.createElement('a')
				const url = URL.createObjectURL(blob)
				a.href = url
				a.download = `微信${this.kind === 'trade' ? '交易' : '资金'}账单-${this.query.from === this.query.to ? this.query.from : this.query.from + '至' + this.query.to}.csv`
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				setTimeout(() => URL.revokeObjectURL(url), 1000)
			} catch (error) {
				notifyError(this, error, '下载账单失败')
			} finally {
				this.downloading = false
			}
		}
	}
}
</script>

<style scoped>
.bills-head { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.bills-sub { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px 16px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f0f0f0; }
.sub-actions { display: flex; gap: 16px; font-size: 13px; }
.sub-actions a.disabled { color: #bfbfbf; pointer-events: none; }
.help { margin: 12px 0 0; padding-left: 18px; color: #8c8c8c; font-size: 12px; line-height: 22px; }
.bills-tip { margin-top: 12px; color: #8c8c8c; font-size: 12px; line-height: 20px; }
.muted { color: #8c8c8c; }
/* 轻量的状态提示：一个小圆点加一行字，不用带底色的提示条 */
.note { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 13px; color: #595959; line-height: 20px; }
.dot { flex: none; width: 6px; height: 6px; border-radius: 50%; background: #bfbfbf; }
.dot.ok { background: #52c41a; }
.dot.warn { background: #fa8c16; }
.sum-grid { display: flex; flex-wrap: wrap; gap: 24px 40px; }
.sum-item { min-width: 120px; }
.sum-k { color: #8c8c8c; font-size: 12px; }
.sum-v { font-size: 18px; font-weight: 600; margin-top: 2px; }
.rec-table { width: 100%; table-layout: fixed; margin: 4px 0 16px; border-collapse: collapse; }
.rec-table col.c-name { width: 140px; }
.rec-table th, .rec-table td { padding: 10px 12px 10px 0; text-align: left; border-bottom: 1px solid #f0f0f0; }
.rec-table th { color: #8c8c8c; font-weight: normal; font-size: 12px; }
.rec-table .rec-diff td { color: #8c8c8c; border-bottom: 0; }
.rec-table .rec-diff td.bad { color: #fa8c16; font-weight: 600; }
.rec-items { margin-top: 8px; }
</style>
