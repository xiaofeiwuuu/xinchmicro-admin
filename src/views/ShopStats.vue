<template>
	<div>
		<!-- 时间范围 -->
		<a-card :bordered="false" class="mb-24">
			<div class="head">
				<a-radio-group v-model="range" button-style="solid" @change="pickPreset">
					<a-radio-button v-for="r in RANGES" :key="r.key" :value="r.key">{{ r.text }}</a-radio-button>
				</a-radio-group>
				<!-- 自定义日期段：选好开始和结束日期就用它统计（含首尾两天，最长一年）；点上面的按钮会清掉 -->
				<a-range-picker v-model="customDates" :locale="pickerLocale" :disabledDate="disabledDate" :allowClear="true" format="YYYY-MM-DD"
					:placeholder="['开始日期', '结束日期']" :class="{ 'range-on': range === 'custom' }" style="width: 260px;" @change="pickCustom" />
				<span class="muted">{{ unitText }}统计 · 北京时间 · 和上一个同样长的时间段比</span>
				<a-button size="small" icon="reload" :loading="loading" @click="load">刷新</a-button>
			</div>
		</a-card>

		<a-spin :spinning="loading && !data">
			<template v-if="data">
				<!-- 关键数字 -->
				<a-row :gutter="24">
					<a-col :xs="24" :sm="12" :xl="{ span: 6 }" :xxl="{ span: 6 }">
						<a-card :bordered="false" class="kpi mb-24">
							<div class="kpi-label">收入</div>
							<div class="kpi-value">{{ yuan(t.revenueFen) }}</div>
							<div class="kpi-sub" v-html="delta(t.revenueFen, p.revenueFen)"></div>
							<div class="kpi-note">退款 {{ yuan(t.refundFen) }}（{{ t.refundOrders }} 单）</div>
						</a-card>
					</a-col>
					<a-col :xs="24" :sm="12" :xl="{ span: 6 }">
						<a-card :bordered="false" class="kpi mb-24">
							<div class="kpi-label">订单数</div>
							<div class="kpi-value">{{ t.orders }}</div>
							<div class="kpi-sub" v-html="delta(t.orders, p.orders)"></div>
							<div class="kpi-note">客单价 {{ yuan(t.avgOrderFen) }}</div>
						</a-card>
					</a-col>
					<a-col :xs="24" :sm="12" :xl="{ span: 6 }">
						<a-card :bordered="false" class="kpi mb-24">
							<div class="kpi-label">成交客户</div>
							<div class="kpi-value">{{ t.payingCustomers }}</div>
							<div class="kpi-sub" v-html="delta(t.payingCustomers, p.payingCustomers)"></div>
							<div class="kpi-note">新客 {{ t.newBuyers }} · 老客 {{ t.repeatBuyers }}</div>
						</a-card>
					</a-col>
					<a-col :xs="24" :sm="12" :xl="{ span: 6 }">
						<a-card :bordered="false" class="kpi mb-24">
							<div class="kpi-label">新增客户</div>
							<div class="kpi-value">{{ t.newCustomers }}</div>
							<div class="kpi-sub" v-html="delta(t.newCustomers, p.newCustomers)"></div>
							<div class="kpi-note">只算有过实际操作的，路过的访客不算</div>
						</a-card>
					</a-col>
				</a-row>

				<!-- 收入 -->
				<a-card :bordered="false" class="mb-24" :title="'收入（' + unitText + '）'">
					<a-radio-group slot="extra" v-model="chartType" size="small">
						<a-radio-button value="bar">柱状</a-radio-button>
						<a-radio-button value="line">折线</a-radio-button>
					</a-radio-group>
					<trend-chart :items="revenueItems" :type="chartType" :format="axisYuan" color="#1890ff" :height="280" aria-label="收入图表" />
				</a-card>

				<!-- 订单、新增客户 -->
				<a-row :gutter="24">
					<a-col :xs="24" :xl="12">
						<a-card :bordered="false" class="mb-24" :title="'订单数（' + unitText + '）'">
							<trend-chart :items="orderItems" :format="axisInt" color="#1890ff" :height="220" aria-label="订单数柱状图" />
						</a-card>
					</a-col>
					<a-col :xs="24" :xl="12">
						<a-card :bordered="false" class="mb-24" :title="'新增客户（' + unitText + '）'">
							<trend-chart :items="customerItems" :format="axisInt" color="#1890ff" :height="220" aria-label="新增客户柱状图" />
						</a-card>
					</a-col>
				</a-row>

				<!-- 排行 -->
				<a-row :gutter="24">
					<a-col :xs="24" :xl="12">
						<a-card :bordered="false" class="mb-24" title="热销产品（按销售额）">
							<div v-if="!data.topProducts.length" class="empty">这段时间没有成交</div>
							<div v-for="(it, i) in data.topProducts" :key="it.productId" class="rank-row">
								<span class="rank-no" :class="{ crown: i < 3 }"><icon-crown v-if="i < 3" :rank="i + 1" :size="26" /><template v-else>{{ i + 1 }}</template></span>
								<div class="rank-main">
									<div class="rank-line"><span class="rank-name" :title="it.name">{{ it.name }}</span><span>{{ yuan(it.revenueFen) }}</span></div>
									<div class="rank-bar"><i :style="{ width: pct(it.revenueFen, data.topProducts[0].revenueFen), background: '#1890ff' }"></i></div>
									<div class="rank-sub">销量 {{ it.qty }} 件</div>
								</div>
							</div>
						</a-card>
					</a-col>
					<a-col :xs="24" :xl="12">
						<a-card :bordered="false" class="mb-24" title="客户消费排行">
							<div v-if="!data.topCustomers.length" class="empty">这段时间没有成交</div>
							<div v-for="(it, i) in data.topCustomers" :key="it.customerId" class="rank-row">
								<span class="rank-no" :class="{ crown: i < 3 }"><icon-crown v-if="i < 3" :rank="i + 1" :size="26" /><template v-else>{{ i + 1 }}</template></span>
								<div class="rank-main">
									<div class="rank-line">
										<router-link :to="{ path: '/shop/orders', query: { customerId: it.customerId } }" class="rank-name">{{ it.nickname || '客户 #' + it.customerId }}</router-link>
										<span>{{ yuan(it.revenueFen) }}</span>
									</div>
									<div class="rank-bar"><i :style="{ width: pct(it.revenueFen, data.topCustomers[0].revenueFen), background: '#1890ff' }"></i></div>
									<div class="rank-sub">{{ it.orders }} 单</div>
								</div>
							</div>
						</a-card>
					</a-col>
				</a-row>

				<div class="muted foot">
					口径：对比的是上一个同样长、同样已经过去的时间段（今天对比昨天同一时刻之前）；自定义日期段含首尾两天，最长 366 天，日期按北京时间。收入 = 统计期内付款成功、且订单没有被取消的金额，按付款时间算（不是下单时间）；付款后被取消的订单算退款，不计入收入。
					新增客户只算有过实际操作的（填过资料、存过地址、下过单等），小程序一打开就会有的访客记录不算。
				</div>
			</template>
		</a-spin>
	</div>
</template>

<script>
import TrendChart from '@/components/TrendChart.vue'
import IconCrown from '@/components/IconCrown.vue'
import moment from 'moment'
import 'moment/locale/zh-cn'
import pickerLocale from 'ant-design-vue/lib/date-picker/locale/zh_CN'
import { getShopStats } from '@/api'
import { notifyError } from '@/utils/notify'

const RANGES = [
	{ key: 'today', text: '今天', unit: '按小时' },
	{ key: '7d', text: '近 7 天', unit: '按天' },
	{ key: '30d', text: '近 30 天', unit: '按天' },
	{ key: '3m', text: '近 3 个月', unit: '按周' },
	{ key: '1y', text: '近 1 年', unit: '按月' }
]

const UNIT_TEXT = { hour: '按小时', day: '按天', week: '按周', month: '按月' }
const MAX_DAYS = 366 // 和服务端一致

const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default {
	name: 'ShopStats',
	components: { TrendChart, IconCrown },
	data() {
		return { RANGES, pickerLocale, range: '7d', chartType: 'bar', customDates: [], customFrom: '', customTo: '', data: null, loading: false, seq: 0 }
	},
	computed: {
		t() { return this.data.totals },
		p() { return this.data.previous },
		// 分段方式：预设范围固定；自定义日期段由服务端按天数决定（1 天按小时、31 天内按天、半年内按周、更长按月）
		unitText() { return this.data && this.range === 'custom' ? UNIT_TEXT[this.data.unit] : (RANGES.find((r) => r.key === this.range) || {}).unit || '' },
		revenueItems() {
			return this.data.buckets.map((b) => ({
				label: b.label,
				title: this.bucketTitle(b),
				value: b.revenueFen / 100,
				tip: [`收入 ${this.yuan(b.revenueFen)}`, `订单 ${b.orders} 单`].concat(b.refundFen ? [`退款 ${this.yuan(b.refundFen)}`] : [])
			}))
		},
		orderItems() { return this.data.buckets.map((b) => ({ label: b.label, title: this.bucketTitle(b), value: b.orders, tip: [`订单 ${b.orders} 单`] })) },
		customerItems() { return this.data.buckets.map((b) => ({ label: b.label, title: this.bucketTitle(b), value: b.newCustomers, tip: [`新增客户 ${b.newCustomers} 个`] })) }
	},
	created() {
		moment.locale('zh-cn') // 日期选择器里的月份、星期显示中文
		this.load()
	},
	methods: {
		async load() {
			const seq = ++this.seq
			this.loading = true
			try {
				const d = await getShopStats(this.range, { from: this.customFrom, to: this.customTo })
				if (seq === this.seq) this.data = d // 连续切换范围时，只认最后一次请求的结果
			} catch (error) {
				if (seq === this.seq) notifyError(this, error, '获取统计数据失败')
			} finally {
				if (seq === this.seq) this.loading = false
			}
		},
		// 点预设按钮：清掉自定义日期
		pickPreset() {
			this.customDates = []
			this.load()
		},
		// 选了自定义日期段（dates 是 moment 数组，清空时为空数组）
		pickCustom(dates) {
			if (!dates || dates.length !== 2) {
				this.range = '7d'
				return this.load()
			}
			const days = dates[1].clone().startOf('day').diff(dates[0].clone().startOf('day'), 'days') + 1
			if (days > MAX_DAYS) {
				this.$message.warning(`最长可以查 ${MAX_DAYS} 天，请缩短日期段`)
				this.customDates = []
				return
			}
			this.customFrom = dates[0].format('YYYY-MM-DD')
			this.customTo = dates[1].format('YYYY-MM-DD')
			this.range = 'custom'
			this.load()
		},
		// 不能选今天以后的日子
		disabledDate(current) { return !!current && current.isAfter(moment().endOf('day')) },
		bucketTitle(b) {
			if (this.data.unit === 'week') return `${b.label} 起的一周`
			if (this.data.unit === 'month') return `20${b.label.slice(0, 2)} 年 ${Number(b.label.slice(3))} 月`
			if (this.data.unit === 'hour') return this.range === 'custom' ? `${this.customFrom} ${b.label}` : `今天 ${b.label}`
			return b.label
		},
		yuan(fen) { return '¥' + group(fen / 100 || 0) + (Math.abs(fen % 100) ? '.' + String(Math.abs(Math.round(fen % 100))).padStart(2, '0') : '') },
		axisYuan(v) { return v >= 10000 ? `${+(v / 10000).toFixed(2)}万` : group(v) },
		axisInt(v) { return Number.isInteger(v) ? String(v) : String(+v.toFixed(1)) },
		pct(v, max) { return max > 0 ? Math.max(2, Math.round((v / max) * 100)) + '%' : '0%' },
		// 和上一个时间段比：上一段是 0 时算不出百分比
		delta(cur, prev) {
			if (!prev) return cur ? '<span class="up">较上期新增</span>' : '<span class="flat">较上期 —</span>'
			const r = ((cur - prev) / prev) * 100
			if (Math.abs(r) < 0.05) return '<span class="flat">较上期持平</span>'
			return r > 0 ? `<span class="up">较上期 ▲ ${r.toFixed(1)}%</span>` : `<span class="down">较上期 ▼ ${Math.abs(r).toFixed(1)}%</span>`
		}
	}
}
</script>

<style scoped>
.range-on { box-shadow: 0 0 0 1px #1890ff; border-radius: 4px; }
.head { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
.muted { color: #8c8c8c; font-size: 12px; }
.foot { line-height: 20px; padding: 0 4px 24px; }
.kpi-label { color: #8c8c8c; }
.kpi-value { font-size: 30px; font-weight: 600; line-height: 44px; }
.kpi-sub { font-size: 13px; min-height: 20px; }
.kpi-note { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #f0f0f0; color: #8c8c8c; font-size: 12px; }
.kpi-sub >>> .up { color: #389e0d; }
.kpi-sub >>> .down { color: #cf1322; }
.kpi-sub >>> .flat { color: #8c8c8c; }
.empty { color: #bfbfbf; padding: 24px 0; text-align: center; }
.rank-row { display: flex; gap: 12px; padding: 8px 0; }
.rank-no { width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background: #f0f2f5; font-size: 12px; flex-shrink: 0; margin: 2px 2px 0; } /* 左右各 2px：数字圆圈 22px + 4px = 26px，和皇冠一样宽，名字才对齐 */
.rank-no.crown { background: none; margin: 0; width: 26px; height: 26px; line-height: 0; display: flex; align-items: center; justify-content: center; }
.rank-main { flex: 1; min-width: 0; }
.rank-line { display: flex; justify-content: space-between; gap: 12px; }
.rank-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-bar { height: 6px; background: #f5f5f5; border-radius: 3px; margin: 6px 0 4px; overflow: hidden; }
.rank-bar i { display: block; height: 100%; border-radius: 3px; }
.rank-sub { color: #8c8c8c; font-size: 12px; }
</style>
