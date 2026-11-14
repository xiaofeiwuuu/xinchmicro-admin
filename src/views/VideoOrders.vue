<!-- 教学视频：视频订单。谁买了哪个视频、实付多少、什么时候付的。只读（视频不退款、不开发票，所以没有操作）。 -->
<template>
	<div>
		<div style="margin-bottom: 16px;">
			<a-form layout="inline">
				<a-form-item><a-input v-model="keyword" placeholder="订单号 / 视频 / 客户" size="small" style="width: 160px" @pressEnter="search" /></a-form-item>
				<a-form-item>
					<a-select v-model="status" size="small" style="width: 160px" placeholder="订单状态" allowClear>
						<a-select-option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.text }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item><date-range-quick v-model="dates" @change="search" /></a-form-item>
				<a-form-item>
					<a-button type="primary" size="small" @click="search">查询</a-button>
					<a-button style="margin-left: 8px" size="small" @click="reset">重置</a-button>
				</a-form-item>
			</a-form>
		</div>
		<div class="summary">已付款 <b>{{ summary.paidCount }}</b> 单，合计 <b>¥{{ summary.paidAmount }}</b>
			<a-tooltip title="只统计已付款的订单，按上面的关键词和日期筛选，不受「订单状态」和分页影响。"><a-icon type="question-circle" class="help-icon" /></a-tooltip>
		</div>

		<a-table :scroll="tableScroll" :columns="columns" :data-source="rows" :loading="loading" rowKey="id" :pagination="pagination" @change="handleTableChange">
			<template slot="orderNo" slot-scope="text"><span class="copy-cell" title="点击复制" @click="copy(text)">{{ text }}</span></template>
			<template slot="video" slot-scope="text, r">
				<div>{{ r.title }}</div>
				<div v-if="r.courseTitle" class="sub">{{ r.courseTitle }}</div>
			</template>
			<template slot="customer" slot-scope="text, r">
				<router-link :to="{ path: '/shop/customers', query: { id: r.customerId } }">{{ r.customerName }}</router-link>
				<div v-if="r.customerPhone" class="sub">{{ r.customerPhone }}</div>
			</template>
			<template slot="amount" slot-scope="text, r">
				<span>¥{{ r.amount }}</span>
				<span v-if="r.listPrice !== r.amount" class="sub" style="margin-left: 6px; text-decoration: line-through;">¥{{ r.listPrice }}</span>
				<a-tag v-if="r.listPrice !== r.amount" color="orange" style="margin-left: 6px;">会员价</a-tag>
			</template>
			<template slot="status" slot-scope="text"><a-tag :color="tag(text).color">{{ tag(text).text }}</a-tag></template>
			<template slot="paidAt" slot-scope="text">{{ text || '-' }}</template>
			<template slot="note" slot-scope="text">{{ text || '-' }}</template>
		</a-table>
	</div>
</template>

<script>
import fixedListLayout from '@/mixins/fixedListLayout';
import DateRangeQuick from '@/components/DateRangeQuick.vue';
import { newPagination, applyTableChange } from '@/utils/pagination';
import { notifyError } from '@/utils/notify';
import { copyToClipboard } from '@/utils/copy';
import { getVideoOrders } from '@/api';

const STATUSES = [
	{ value: 'paid', text: '已付款', color: 'green' },
	{ value: 'pending', text: '待付款', color: 'blue' },
	{ value: 'cancelled', text: '已取消', color: undefined }
];

export default {
	mixins: [fixedListLayout],
	components: { DateRangeQuick },
	data() {
		return {
			STATUSES,
			keyword: '', status: undefined, dates: [],
			applied: { keyword: '', status: undefined, dates: [] },
			rows: [], loading: false, pagination: newPagination(),
			summary: { paidCount: 0, paidAmount: 0 },
			columns: [
				{ title: '订单号', dataIndex: 'orderNo', key: 'orderNo', scopedSlots: { customRender: 'orderNo' } },
				{ title: '视频', key: 'video', scopedSlots: { customRender: 'video' } },
				{ title: '客户', key: 'customer', scopedSlots: { customRender: 'customer' } },
				{ title: '实付', key: 'amount', scopedSlots: { customRender: 'amount' } },
				{ title: '状态', dataIndex: 'status', key: 'status', scopedSlots: { customRender: 'status' } },
				{ title: '下单时间', dataIndex: 'createdAt', key: 'createdAt' },
				{ title: '付款时间', dataIndex: 'paidAt', key: 'paidAt', scopedSlots: { customRender: 'paidAt' } },
				{ title: '备注', dataIndex: 'note', key: 'note', scopedSlots: { customRender: 'note' } }
			]
		};
	},
	mounted() {
		this.load();
	},
	methods: {
		tag(s) {
			return STATUSES.find((x) => x.value === s) || { text: s, color: undefined };
		},
		async copy(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制：' + text);
			else this.$message.warning('复制失败，请手动复制');
		},
		search() {
			this.applied = { keyword: this.keyword.trim(), status: this.status, dates: this.dates };
			this.pagination.current = 1;
			this.load();
		},
		reset() {
			this.keyword = ''; this.status = undefined; this.dates = [];
			this.search();
		},
		async load() {
			const a = this.applied;
			this.loading = true;
			try {
				const data = await getVideoOrders({
					keyword: a.keyword || undefined, status: a.status,
					from: a.dates[0] ? a.dates[0].format('YYYY-MM-DD') : undefined, to: a.dates[1] ? a.dates[1].format('YYYY-MM-DD') : undefined,
					page: this.pagination.current, pageSize: this.pagination.pageSize
				});
				this.rows = data.list;
				this.pagination.total = data.total;
				this.summary = data.summary;
			} catch (e) {
				notifyError(this, e, '获取视频订单失败');
			} finally {
				this.loading = false;
			}
		},
		handleTableChange(p) {
			applyTableChange(this.pagination, p);
			this.load();
		}
	}
};
</script>

<style scoped>
.summary { margin-bottom: 12px; color: #666; }
.summary b { color: #111827; }
.sub { color: #999; font-size: 12px; }
.copy-cell { cursor: pointer; }
</style>
