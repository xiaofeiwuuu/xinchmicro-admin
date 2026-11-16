<!-- 教学视频：视频订单。谁买了哪个视频、实付多少、什么时候付的。列表只放必要的几列，其余（课程、手机号、原价、付款时间、微信支付单号、备注）都在「详情」里。只读（视频不退款、不开发票，所以没有别的操作）。 -->
<template>
	<div>
		<div style="margin-bottom: 16px;">
			<a-form layout="inline">
				<!-- 每个字段一个输入框，不合并 -->
				<a-form-item><a-input v-model="f.orderNo" placeholder="订单号" size="small" style="width: 160px" allowClear @pressEnter="search" /></a-form-item>
				<a-form-item><a-input v-model="f.title" placeholder="视频标题" size="small" style="width: 160px" allowClear @pressEnter="search" /></a-form-item>
				<a-form-item><a-input v-model="f.customerId" placeholder="客户编号" size="small" style="width: 160px" allowClear @pressEnter="search" /></a-form-item>
				<a-form-item><a-input v-model="f.nickname" placeholder="客户昵称" size="small" style="width: 160px" allowClear @pressEnter="search" /></a-form-item>
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
				<a-form-item>
					<a-button size="small" icon="download" :loading="exporting" @click="exportOrders">导出订单</a-button>
				</a-form-item>
				<!-- 开通记录：谁被手动开通/赠送了什么视频、原因、操作人，可以撤销。开通/赠送本身在「客户管理」每一行的「更多」里 -->
				<a-form-item v-can="'video.grant'">
					<a-button size="small" icon="file" @click="openRecords">开通记录</a-button>
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
			<template slot="status" slot-scope="text, r"><a-tag :color="stateTag(r).color">{{ stateTag(r).text }}</a-tag></template>
			<template slot="action" slot-scope="text, r">
				<div class="row-actions">
					<a-button type="link" size="small" @click="openDetail(r)"><a-icon type="eye" style="color: #111827" /><span class="text-dark">详情</span></a-button>
					<a-dropdown v-if="canRefund(r)" :trigger="['click']" placement="bottomRight">
						<a-button type="link" size="small" @click.prevent><a-icon type="ellipsis" style="color: #111827" /><span class="text-dark">更多</span></a-button>
						<a-menu slot="overlay" @click="() => openRefund(r)">
							<a-menu-item key="refund"><span class="act-danger">退款</span></a-menu-item>
						</a-menu>
					</a-dropdown>
				</div>
			</template>
		</a-table>

		<!-- 详情：一张卡片，上面是金额 + 状态 + 订单号，下面是其余信息；没有按钮，右上角叉关闭 -->
		<a-modal title="订单详情" :visible="detailVisible" :width="620" :footer="null" @cancel="detailVisible = false">
			<div v-if="detail" class="dt-card">
				<div class="dt-head">
					<div class="dt-amount">¥{{ detail.amount }}</div>
					<div class="dt-main">
						<a-tag :color="stateTag(detail).color">{{ stateTag(detail).text }}</a-tag>
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
					<template v-if="detail.refundStatus">
						<div class="dt-k">退款原因</div><div class="dt-v">{{ detail.refundReason || '-' }}</div>
						<div class="dt-k">退款操作人</div><div class="dt-v">{{ detail.refundedByName || '-' }}</div>
						<div class="dt-k">退款到账</div><div class="dt-v">{{ detail.refundedAt || '-' }}</div>
					</template>
				</div>
			</div>
		</a-modal>

		<!-- 退款（全额，客户在小程序不能申请） -->
		<a-modal :title="refundTarget ? '退款：' + refundTarget.customerName + '　¥' + refundTarget.amount : '退款'" :visible="refundVisible" :width="460" :maskClosable="false" okText="确认退款" :okButtonProps="{ props: { type: 'danger' } }" :confirmLoading="refunding" @ok="submitRefund" @cancel="refundVisible = false">
			<a-form-item label="退款原因" required :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }" style="margin-bottom: 0">
				<a-input v-model="refundReason" :maxLength="80" placeholder="请填写原因" />
			</a-form-item>
		</a-modal>
		<!-- 开通记录 -->
		<a-modal title="开通记录" :visible="rVisible" :width="900" :footer="null" @cancel="rVisible = false">
			<div class="r-bar">
				<a-radio-group v-model="rStatus" button-style="solid" size="small" @change="loadRecords(1)">
					<a-radio-button value="">全部</a-radio-button>
					<a-radio-button value="active">有效</a-radio-button>
					<a-radio-button value="revoked">已撤销</a-radio-button>
				</a-radio-group>
				<a-input v-model="rf.customerId" size="small" allow-clear placeholder="客户编号" style="width: 110px; margin-left: 12px" @pressEnter="loadRecords(1)" />
				<a-input v-model="rf.nickname" size="small" allow-clear placeholder="客户昵称" style="width: 120px; margin-left: 8px" @pressEnter="loadRecords(1)" />
				<a-input v-model="rf.videoTitle" size="small" allow-clear placeholder="视频标题" style="width: 140px; margin-left: 8px" @pressEnter="loadRecords(1)" />
				<a-input v-model="rf.reason" size="small" allow-clear placeholder="原因" style="width: 120px; margin-left: 8px" @pressEnter="loadRecords(1)" />
				<a-button type="primary" size="small" style="margin-left: 8px" @click="loadRecords(1)">查询</a-button>
			</div>
			<a-table size="small" rowKey="id" :columns="rColumns" :data-source="rRows" :loading="rLoading" :pagination="rPage" :scroll="{ y: 360 }" @change="(p) => loadRecords(p.current)">
				<template slot="cust" slot-scope="t, r"><span>{{ r.customerName || '（没有昵称）' }}</span> <span class="sub">#{{ r.customerId }}{{ r.customerPhone ? ' · ' + r.customerPhone : '' }}</span></template>
				<template slot="vid" slot-scope="t, r"><div>{{ r.videoTitle }}</div><div v-if="r.courseTitle" class="sub">{{ r.courseTitle }}</div></template>
				<template slot="by" slot-scope="t, r"><div>{{ r.grantedByName || '-' }}</div><div class="sub">{{ timeText(r.createdAt) }}</div></template>
				<template slot="st" slot-scope="t, r"><a-tag :color="r.status === 'active' ? 'green' : undefined">{{ r.status === 'active' ? '有效' : '已撤销' }}</a-tag><div v-if="r.status !== 'active'" class="sub">{{ r.revokedByName }} {{ timeText(r.revokedAt) }}</div></template>
				<template slot="act" slot-scope="t, r"><a-button v-if="r.status === 'active'" type="link" size="small" @click="revoke(r)"><span class="text-danger">撤销</span></a-button></template>
			</a-table>
		</a-modal>
	</div>
</template>

<script>
import fixedListLayout from '@/mixins/fixedListLayout';
import DateRangeQuick from '@/components/DateRangeQuick.vue';
import { newPagination, applyTableChange } from '@/utils/pagination';
import { notifyError } from '@/utils/notify';
import { copyToClipboard } from '@/utils/copy';
import { videoOrdersCsv } from '@/utils/video';
import { downloadText } from '@/utils/orderTools';
import { can } from '@/utils/auth';
import { getVideoOrders, getVideoGrants, revokeVideoGrant, refundVideoOrder } from '@/api';

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
			f: { orderNo: '', title: '', customerId: '', nickname: '' }, status: undefined, dates: [],
			applied: { orderNo: '', title: '', customerId: '', nickname: '', status: undefined, dates: [] },
			detailVisible: false, detail: null, exporting: false,
			refundVisible: false, refundTarget: null, refundReason: '', refunding: false,
			// 开通记录
			rVisible: false, rLoading: false, rStatus: '', rf: { customerId: '', nickname: '', videoTitle: '', reason: '' }, rRows: [], rPage: { current: 1, pageSize: 10, total: 0, showTotal: (t) => `共 ${t} 条` },
			rColumns: [
				{ title: '客户', key: 'cust', scopedSlots: { customRender: 'cust' } },
				{ title: '视频', key: 'vid', scopedSlots: { customRender: 'vid' } },
				{ title: '原因', dataIndex: 'reason', key: 'reason' },
				{ title: '操作人 / 时间', key: 'by', width: 170, scopedSlots: { customRender: 'by' } },
				{ title: '状态', key: 'st', width: 130, scopedSlots: { customRender: 'st' } },
				{ title: '操作', key: 'act', width: 70, align: 'right', scopedSlots: { customRender: 'act' } }
			],
			rows: [], loading: false, // 已付款几单、合计多少放在分页那一行（只统计已付款的，按关键词和日期筛选，不受「订单状态」和分页影响）
			pagination: newPagination({ showTotal: (t) => `共 ${t} 条　已付款 ${this.summary.paidCount} 单，合计 ¥${this.summary.paidAmount}${this.summary.refundedCount ? `，已退款 ${this.summary.refundedCount} 单 ¥${this.summary.refundedAmount}` : ''}` }),
			summary: { paidCount: 0, paidAmount: 0 },
			// 列表只放必要的：订单号、视频、客户、实付、状态、下单时间；其余在「详情」里。状态、操作窄，其余平分
			columns: [
				{ title: '订单号', dataIndex: 'orderNo', key: 'orderNo', scopedSlots: { customRender: 'orderNo' } },
				{ title: '视频', key: 'video', scopedSlots: { customRender: 'video' } },
				{ title: '客户', key: 'customer', scopedSlots: { customRender: 'customer' } },
				{ title: '实付', key: 'amount', scopedSlots: { customRender: 'amount' } },
				{ title: '状态', dataIndex: 'status', key: 'status', width: 90, scopedSlots: { customRender: 'status' } },
				{ title: '下单时间', dataIndex: 'createdAt', key: 'createdAt' },
				{ title: '操作', key: 'action', align: 'right', width: 170, scopedSlots: { customRender: 'action' } }
			]
		};
	},
	watch: {
		// 从客户管理（customerId）或通知铃铛（orderNo）点过来：按对应的字段筛选
		'$route.query'(q) { if (q.customerId || q.orderNo) { this.f = { orderNo: String(q.orderNo || ''), title: '', customerId: String(q.customerId || ''), nickname: '' }; this.search(); } }
	},
	mounted() {
		// 从客户管理或通知铃铛点进来：带着客户编号或订单号，直接按它筛选
		const q = (this.$route && this.$route.query) || {};
		if (q.customerId || q.orderNo) {
			this.f = { orderNo: String(q.orderNo || ''), title: '', customerId: String(q.customerId || ''), nickname: '' };
			this.applied = { ...this.applied, ...this.f };
		}
		this.load();
	},
	methods: {
		timeText(t) { if (!t) return ''; const d = new Date(t); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }); },
		// ---- 开通记录 ----
		openRecords() { this.rVisible = true; this.rStatus = ''; this.rf = { customerId: '', nickname: '', videoTitle: '', reason: '' }; this.loadRecords(1); },
		async loadRecords(page) {
			this.rLoading = true;
			try {
				const r = await getVideoGrants({ page, pageSize: this.rPage.pageSize, status: this.rStatus || undefined, customerId: this.rf.customerId.trim() || undefined, nickname: this.rf.nickname.trim() || undefined, videoTitle: this.rf.videoTitle.trim() || undefined, reason: this.rf.reason.trim() || undefined });
				this.rRows = r.list; this.rPage = { ...this.rPage, current: r.page, total: r.total };
			} catch (e) { notifyError(this, e, '获取开通记录失败'); } finally { this.rLoading = false; }
		},
		revoke(r) {
			this.$confirm({
				title: `撤销「${r.customerName || '#' + r.customerId}」的《${r.videoTitle}》吗？`,
				content: '撤销后客户不能再观看这个视频（如果他自己买过，不受影响）。',
				okText: '撤销', okType: 'danger', cancelText: '取消',
				onOk: async () => { try { await revokeVideoGrant(r.id); this.$message.success('已撤销'); await this.loadRecords(this.rPage.current); } catch (e) { notifyError(this, e, '撤销失败'); } }
			});
		},
		// 导出：按当前搜索条件分页取全部（每页 100，最多 5000 单），CSV 带 BOM，Excel 直接打开
		exportOrders() {
			const a = this.applied; const parts = [];
			if (a.orderNo) parts.push(`订单号：${a.orderNo}`);
			if (a.title) parts.push(`视频标题：${a.title}`);
			if (a.customerId) parts.push(`客户编号：${a.customerId}`);
			if (a.nickname) parts.push(`客户昵称：${a.nickname}`);
			if (a.status) parts.push(`状态：${(STATUSES.find((x) => x.value === a.status) || {}).text || a.status}`);
			if (a.dates && a.dates[0]) parts.push(`下单日期：${a.dates[0].format('YYYY-MM-DD')} 到 ${a.dates[1].format('YYYY-MM-DD')}`);
			const h = this.$createElement;
			this.$confirm({
				title: '导出视频订单', width: 420, okText: '确认导出', cancelText: '取消',
				content: h('div', [
					h('div', ['将导出', h('b', ' 当前搜索结果 '), `共 ${this.pagination.total} 单（最多 5000 单）。`]),
					h('div', { style: 'margin-top: 8px; color: #8c8c8c;' }, parts.length ? '搜索条件：' + parts.join('；') : '当前没有设置搜索条件，会导出全部视频订单。')
				]),
				onOk: () => this.doExport()
			});
		},
		async doExport() {
			const MAX = 5000; const a = this.applied;
			this.exporting = true;
			try {
				const all = [];
				for (let page = 1; all.length < MAX; page++) {
					const data = await getVideoOrders({
						orderNo: a.orderNo || undefined, title: a.title || undefined, customerId: a.customerId || undefined, nickname: a.nickname || undefined, status: a.status,
						from: a.dates[0] ? a.dates[0].format('YYYY-MM-DD') : undefined, to: a.dates[1] ? a.dates[1].format('YYYY-MM-DD') : undefined,
						page, pageSize: 100
					});
					all.push(...data.list);
					if (page * 100 >= data.total || !data.list.length) break;
				}
				if (!all.length) return this.$message.warning('当前条件下没有订单');
				const statusText = Object.fromEntries(STATUSES.map((x) => [x.value, x.text]));
				downloadText(videoOrdersCsv(all.slice(0, MAX), statusText), `视频订单导出-${new Date().toISOString().slice(0, 10)}.csv`);
				this.$message.success(`已导出 ${Math.min(all.length, MAX)} 单${all.length > MAX ? `（超过 ${MAX} 单，请缩小筛选范围分批导出）` : ''}`);
			} catch (e) { notifyError(this, e, '导出失败'); } finally { this.exporting = false; }
		},
		openDetail(r) {
			this.detail = r;
			this.detailVisible = true;
		},
		// 列表和详情里的状态：有退款状态就显示退款状态（订单本身仍是已付款）
		stateTag(r) {
			const m = { success: { text: '已退款', color: 'red' }, processing: { text: '退款中', color: 'blue' }, failed: { text: '退款失败', color: 'orange' } }[r.refundStatus];
			return m || this.tag(r.status);
		},
		canRefund(r) { return can('video.refund') && r.status === 'paid' && r.refundStatus !== 'processing' && r.refundStatus !== 'success'; },
		openRefund(r) { this.refundTarget = r; this.refundReason = ''; this.refundVisible = true; },
		async submitRefund() {
			if (!this.refundReason.trim()) return this.$message.warning('请填写退款原因');
			this.refunding = true;
			try {
				await refundVideoOrder(this.refundTarget.id, this.refundReason.trim());
				this.$message.success('已申请退款');
				this.refundVisible = false;
				await this.load();
			} catch (e) { notifyError(this, e, '退款失败'); } finally { this.refunding = false; }
		},
		tag(s) {
			return STATUSES.find((x) => x.value === s) || { text: s, color: undefined };
		},
		async copy(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制：' + text);
			else this.$message.warning('复制失败，请手动复制');
		},
		search() {
			const t = (x) => String(x || '').trim();
			this.applied = { orderNo: t(this.f.orderNo), title: t(this.f.title), customerId: t(this.f.customerId), nickname: t(this.f.nickname), status: this.status, dates: this.dates };
			this.pagination.current = 1;
			this.load();
		},
		reset() {
			this.f = { orderNo: '', title: '', customerId: '', nickname: '' }; this.status = undefined; this.dates = [];
			if (Object.keys(this.$route.query).length) this.$router.replace({ path: '/video-orders' }).catch(() => {});
			this.search();
		},
		async load() {
			const a = this.applied;
			this.loading = true;
			try {
				const data = await getVideoOrders({
					orderNo: a.orderNo || undefined, title: a.title || undefined, customerId: a.customerId || undefined, nickname: a.nickname || undefined, status: a.status,
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
.r-bar { margin-bottom: 12px; }
.act-danger { color: #cf1322; }
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
