<template>
	<div>
		<!-- 查询：日期段（日期在前、快捷按钮在后）+ 产品名搜索。扣除退款的开关不放在搜索条件里，放在下面的汇总行 -->
		<a-card :bordered="false" class="mb-24">
			<div class="ps-head">
				<date-range-quick v-model="dates" :quicks="QUICK" :allowClear="false" :pickerWidth="260" @change="load" />
				<a-input v-model="keyword" placeholder="产品名称" style="width: 160px; margin-left: 12px;" allowClear @pressEnter="onSearch" />
				<a-button type="primary" style="margin-left: 8px;" @click="onSearch"><a-icon type="search" /> 搜索</a-button>
				<a-button :loading="exporting" style="margin-left: auto;" @click="exportCsv">导出（CSV）</a-button>
			</div>

			<!-- 汇总 + 扣除退款开关 -->
			<div class="ps-sum">
				<span>共 <b>{{ summary.products }}</b> 个产品有成交，合计 <b>{{ summary.qty }}</b> 件，销售额 <b>{{ yuan(summary.revenueFen) }}</b>，涉及 <b>{{ summary.orders }}</b> 个订单</span>
				<span class="ps-toggle">
					<a-switch v-model="excludeRefund" size="small" @change="load" />
					<span style="margin-left: 8px;">扣除已全额退款的订单</span>
					<a-tooltip title="打开后，售后已经全额退款的订单不计入销量和销售额。部分退款的订单没法知道退的是哪几件，所以不扣。付款后被取消的订单（已退款）本来就不算。">
						<a-icon type="question-circle" style="margin-left: 6px; color: #8c8c8c;" />
					</a-tooltip>
					<span v-if="excludeRefund && summary.excludedOrders" class="ps-excluded">（已排除 {{ summary.excludedOrders }} 个订单）</span>
				</span>
			</div>
		</a-card>

		<a-card :bordered="false">
			<a-table :scroll="tableScroll" rowKey="productId" :columns="columns" :dataSource="rows" :loading="loading" :pagination="pagination" @change="onTableChange">
				<template slot="name" slot-scope="text">
					<span class="copy-cell" title="点击复制" @click="copyName(text)">{{ text }}</span>
				</template>
				<template slot="qty" slot-scope="text">
					<b>{{ text }}</b>
				</template>
				<template slot="revenue" slot-scope="text">{{ yuan(text) }}</template>
				<template slot="avg" slot-scope="text">{{ yuan(text) }}</template>
			</a-table>
			<div class="ps-note">统计口径：付款成功、没被取消的订单（按付款时间），数量和金额是下单时的快照。只统计这段时间有成交的产品。</div>
		</a-card>
	</div>
</template>

<script>
import moment from 'moment'
import 'moment/locale/zh-cn'
import DateRangeQuick from '@/components/DateRangeQuick.vue'
import { RECENT_QUICKS } from '@/utils/dateQuick'
import { getProductSalesStats } from '@/api'
import { notifyError } from '@/utils/notify'
import { copyToClipboard } from '@/utils/copy'
import { toCsv } from '@/utils/shop'
import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

const num = (key) => (a, b) => a[key] - b[key]

export default {
	mixins: [fixedListLayout],
	components: { DateRangeQuick },
	data() {
		return {
			QUICK: RECENT_QUICKS,
			dates: [moment().startOf('day').subtract(29, 'day'), moment().startOf('day')], // 默认近 30 天
			keyword: '', // 点「搜索」才生效的关键词
			applied: '',
			excludeRefund: false,
			loading: false,
			exporting: false,
			products: [],
			summary: { products: 0, qty: 0, revenueFen: 0, orders: 0, excludedOrders: 0 },
			pagination: newPagination(),
			sortKey: 'qty',
			sortOrder: 'descend'
		}
	},
	computed: {
		// 搜索按产品名模糊匹配（数据已经全部在页面里，不再请求）；排序也在页面里做，表头点一下就换
		rows() {
			const kw = this.applied.trim().toLowerCase()
			const list = kw ? this.products.filter((p) => String(p.name).toLowerCase().includes(kw)) : this.products.slice()
			const dir = this.sortOrder === 'ascend' ? 1 : -1
			const cmp = { qty: num('qty'), revenueFen: num('revenueFen'), orders: num('orders'), avgPriceFen: num('avgPriceFen') }[this.sortKey] || num('qty')
			return list.sort((a, b) => dir * cmp(a, b) || b.qty - a.qty || a.productId - b.productId).map((p, i) => ({ ...p, rank: i + 1 }))
		},
		columns() {
			// 点表头在「从大到小 ↔ 从小到大」之间来回切（第一次点是从大到小，销量更常看多的）；不要三态里的「取消排序」
			const sorter = (key) => ({ sorter: true, sortDirections: ['descend', 'ascend'], sortOrder: this.sortKey === key ? this.sortOrder : false })
			return [
				{ title: '排名', dataIndex: 'rank', key: 'rank' },
				{ title: '产品', dataIndex: 'name', key: 'name', scopedSlots: { customRender: 'name' } },
				{ title: '销量（件）', dataIndex: 'qty', key: 'qty', scopedSlots: { customRender: 'qty' }, ...sorter('qty') },
				{ title: '销售额', dataIndex: 'revenueFen', key: 'revenueFen', scopedSlots: { customRender: 'revenue' }, ...sorter('revenueFen') },
				{ title: '订单数', dataIndex: 'orders', key: 'orders', ...sorter('orders') },
				{ title: '平均单价', dataIndex: 'avgPriceFen', key: 'avgPriceFen', scopedSlots: { customRender: 'avg' }, ...sorter('avgPriceFen') }
			]
		}
	},
	mounted() {
		moment.locale('zh-cn')
		this.load()
	},
	methods: {
		yuan: (fen) => '¥' + (Number(fen || 0) / 100).toFixed(2),
		async load() {
			if (this.dates.length !== 2) return
			try {
				this.loading = true
				const d = await getProductSalesStats({ from: this.dates[0].format('YYYY-MM-DD'), to: this.dates[1].format('YYYY-MM-DD'), excludeRefund: this.excludeRefund ? 1 : undefined })
				this.products = d.products || []
				this.summary = d.summary
				this.pagination.current = 1
			} catch (error) {
				notifyError(this, error, '获取产品销量失败')
			} finally {
				this.loading = false
			}
		},
		onSearch() {
			this.applied = this.keyword
			this.pagination.current = 1
		},
		// 表头点排序：antd 的排序是「从大到小 → 从小到大 → 取消」三步循环。这里不要「取消」：点到取消那一步时，改成回到「从大到小」，
		// 这样同一列一直在两种方向之间来回切（以前把取消当成「回到按销量从大到小」，点到第三下就像点不动了）
		onTableChange(p, filters, sorter) {
			applyTableChange(this.pagination, p)
			if (sorter && sorter.order) {
				this.sortKey = sorter.columnKey
				this.sortOrder = sorter.order
			} else {
				this.sortOrder = 'descend'
			}
		},
		async copyName(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制：' + text)
			else this.$message.warning('复制失败，请手动复制')
		},
		// 导出当前搜索和排序后的全部产品（不只是当前页）
		exportCsv() {
			this.exporting = true
			try {
				const out = [['排名', '产品ID', '产品名称', '销量（件）', '销售额（元）', '订单数', '平均单价（元）']]
				this.rows.forEach((r) => out.push([r.rank, r.productId, r.name, r.qty, (r.revenueFen / 100).toFixed(2), r.orders, (r.avgPriceFen / 100).toFixed(2)]))
				const blob = new Blob([toCsv(out)], { type: 'text/csv;charset=utf-8' })
				const a = document.createElement('a')
				a.href = URL.createObjectURL(blob)
				a.download = `产品销量_${this.dates[0].format('YYYYMMDD')}-${this.dates[1].format('YYYYMMDD')}${this.excludeRefund ? '_扣除全额退款' : ''}.csv`
				a.click()
				URL.revokeObjectURL(a.href)
			} finally {
				this.exporting = false
			}
		}
	}
}
</script>

<style scoped>
.ps-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 0; }
.ps-sum { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 24px; margin-top: 16px; color: #595959; }
.ps-sum b { color: #262626; }
.ps-toggle { display: inline-flex; align-items: center; }
.ps-excluded { margin-left: 8px; color: #fa8c16; font-size: 12px; }
.ps-note { margin-top: 12px; color: #8c8c8c; font-size: 12px; }
.copy-cell { cursor: pointer; }
.copy-cell:hover { color: #1890ff; }
</style>
