<!-- 教学视频：视频订单。谁买了哪个视频、实付多少、什么时候付的。列表只放必要的几列，其余（课程、手机号、原价、付款时间、微信支付单号、备注）都在「详情」里。只读（视频不退款、不开发票，所以没有别的操作）。 -->
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

		<a-table :scroll="tableScroll" :columns="columns" :data-source="rows" :loading="loading" rowKey="id" :pagination="pagination" @change="handleTableChange">
			<template slot="orderNo" slot-scope="text"><span class="copy-cell" title="点击复制" @click="copy(text)">{{ text }}</span></template>
			<template slot="video" slot-scope="text, r"><span class="copy-cell" title="点击复制" @click="copy(r.title)">{{ r.title }}</span></template>
			<template slot="customer" slot-scope="text, r">
				<router-link :to="{ path: '/shop/customers', query: { id: r.customerId } }">{{ r.customerName }}</router-link>
			</template>
			<template slot="amount" slot-scope="text, r">¥{{ r.amount }}</template>
			<template slot="status" slot-scope="text"><a-tag :color="tag(text).color">{{ tag(text).text }}</a-tag></template>
			<template slot="action" slot-scope="text, r">
				<a-button type="link" size="small" @click="openDetail(r)"><a-icon type="eye" style="color: #111827" /><span class="text-dark">详情</span></a-button>
			</template>
		</a-table>

		<!-- 详情：一张卡片，上面是金额 + 状态 + 订单号，下面是其余信息；没有按钮，右上角叉关闭 -->
		<a-modal title="订单详情" :visible="detailVisible" :width="620" :footer="null" @cancel="detailVisible = false">
			<div v-if="detail" class="dt-card">
				<div class="dt-head">
					<div class="dt-amount">¥{{ detail.amount }}</div>
					<div class="dt-main">
						<a-tag :color="tag(detail.status).color">{{ tag(detail.status).text }}</a-tag>
						<a-tag v-if="detail.listPrice !== detail.amount" color="orange">会员价</a-tag>
						<div class="dt-no"><span class="copy-cell" title="点击复制" @click="copy(detail.orderNo)">{{ detail.orderNo }}</span></div>
					</div>
				</div>
				<div class="dt-grid">
					<div class="dt-k">视频</div><div class="dt-v"><span class="copy-cell" title="点击复制" @click="copy(detail.title)">{{ detail.title }}</span></div>
					<div class="dt-k">所属课程</div><div class="dt-v">{{ detail.courseTitle || '-' }}</div>
					<div class="dt-k">客户</div><div class="dt-v"><router-link :to="{ path: '/shop/customers', query: { id: detail.customerId } }">{{ detail.customerName }}</router-link></div>
					<div class="dt-k">手机号</div><div class="dt-v">{{ detail.customerPhone || '-' }}</div>
					<div class="dt-k">原价</div><div class="dt-v">¥{{ detail.listPrice }}</div>
					<div class="dt-k">实付</div><div class="dt-v">¥{{ detail.amount }}<span v-if="detail.listPrice !== detail.amount" class="dt-sub">（会员价，比原价少 ¥{{ (detail.listPrice - detail.amount).toFixed(2).replace(/\.00$/, '') }}）</span></div>
					<div class="dt-k">下单时间</div><div class="dt-v">{{ detail.createdAt || '-' }}</div>
					<div class="dt-k">付款时间</div><div class="dt-v">{{ detail.paidAt || '-' }}</div>
					<div class="dt-k">微信支付单号</div><div class="dt-v"><span v-if="detail.transactionId" class="copy-cell" title="点击复制" @click="copy(detail.transactionId)">{{ detail.transactionId }}</span><span v-else class="dt-empty">没有</span></div>
					<div class="dt-k">备注</div><div class="dt-v dt-pre"><template v-if="detail.note">{{ detail.note }}</template><span v-else class="dt-empty">没有</span></div>
				</div>
			</div>
		</a-modal>
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
			detailVisible: false, detail: null,
			rows: [], loading: false, // 已付款几单、合计多少放在分页那一行（只统计已付款的，按关键词和日期筛选，不受「订单状态」和分页影响）
			pagination: newPagination({ showTotal: (t) => `共 ${t} 条　已付款 ${this.summary.paidCount} 单，合计 ¥${this.summary.paidAmount}` }),
			summary: { paidCount: 0, paidAmount: 0 },
			// 列表只放必要的：订单号、视频、客户、实付、状态、下单时间；其余在「详情」里。状态、操作窄，其余平分
			columns: [
				{ title: '订单号', dataIndex: 'orderNo', key: 'orderNo', scopedSlots: { customRender: 'orderNo' } },
				{ title: '视频', key: 'video', scopedSlots: { customRender: 'video' } },
				{ title: '客户', key: 'customer', scopedSlots: { customRender: 'customer' } },
				{ title: '实付', key: 'amount', scopedSlots: { customRender: 'amount' } },
				{ title: '状态', dataIndex: 'status', key: 'status', width: 90, scopedSlots: { customRender: 'status' } },
				{ title: '下单时间', dataIndex: 'createdAt', key: 'createdAt' },
				{ title: '操作', key: 'action', align: 'right', width: 100, scopedSlots: { customRender: 'action' } }
			]
		};
	},
	mounted() {
		this.load();
	},
	methods: {
		openDetail(r) {
			this.detail = r;
			this.detailVisible = true;
		},
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
.dt-card { border: 1px solid #ebeef5; border-radius: 10px; overflow: hidden; }
.dt-head { display: flex; align-items: center; padding: 18px 20px; background: linear-gradient(135deg, #f4f8ff, #fafcff); border-bottom: 1px solid #ebeef5; }
.dt-amount { font-size: 30px; font-weight: 700; color: #111827; line-height: 1; min-width: 120px; }
.dt-main { margin-left: 20px; }
.dt-no { margin-top: 8px; color: #6b7280; font-size: 13px; }
.dt-grid { display: grid; grid-template-columns: 130px 1fr; }
.dt-k, .dt-v { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; }
.dt-k:nth-last-child(2), .dt-v:last-child { border-bottom: 0; }
.dt-k { color: #6b7280; background: #fcfcfd; }
.dt-v { background: #fff; word-break: break-all; }
.dt-sub { color: #fa8c16; margin-left: 6px; font-size: 12px; }
.dt-pre { white-space: pre-wrap; }
.dt-empty { color: #bfbfbf; }
.sub { color: #999; font-size: 12px; }
.copy-cell { cursor: pointer; }
</style>
