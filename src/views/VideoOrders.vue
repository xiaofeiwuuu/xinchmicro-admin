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
				<!-- 手动开通/赠送：付款异常补开通、送客户、内部测试。不是购买，不产生订单、不算成交 -->
				<a-form-item v-can="'video.grant'">
					<a-button size="small" icon="plus" @click="openGrant">手动开通 / 赠送</a-button>
					<a-button size="small" icon="file" style="margin-left: 8px" @click="openRecords">开通记录</a-button>
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
		<!-- 手动开通 / 赠送 -->
		<a-modal title="手动开通 / 赠送视频" :visible="gVisible" :width="620" :maskClosable="false" okText="开通" :confirmLoading="gSaving" @ok="submitGrant" @cancel="gVisible = false">
			<a-form layout="horizontal" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
				<a-form-item required label="客户">
					<a-select v-model="gForm.customerId" show-search :filter-option="false" :not-found-content="gSearched ? '没有找到这个客户' : '输入后搜索'" placeholder="输入客户编号、昵称或手机号搜索" @search="searchCustomers">
						<a-select-option v-for="c in gCustomers" :key="c.id" :value="c.id">#{{ c.id }}　{{ c.nickname || '（没有昵称）' }}{{ c.phone ? '　' + c.phone : '' }}{{ c.blocked ? '　（已被拉黑）' : '' }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item required label="视频">
					<a-select v-model="gForm.videoIds" mode="multiple" :max-tag-count="3" placeholder="选择要开通的视频（可多选、可搜索）" option-filter-prop="label">
						<a-select-option v-for="v in gVideos" :key="v.id" :value="v.id" :label="v.courseTitle + ' ' + v.title">{{ v.courseTitle }}　{{ v.title }}</a-select-option>
					</a-select>
					<div class="g-quick">
						快速选整个课程：
						<a-select size="small" style="width: 200px" placeholder="选课程，把它的视频都加上" :value="undefined" @change="addCourse">
							<a-select-option v-for="c in gCourses" :key="c.id" :value="c.id">{{ c.title }}（{{ c.videoCount }} 集）</a-select-option>
						</a-select>
						<a v-if="gForm.videoIds.length" style="margin-left: 12px" @click="gForm.videoIds = []">清空（已选 {{ gForm.videoIds.length }} 集）</a>
					</div>
				</a-form-item>
				<a-form-item required label="原因">
					<a-input v-model="gForm.reason" :maxLength="100" placeholder="必填，会记下来，之后查记录能看到" />
					<div class="g-quick"><a v-for="r in G_REASONS" :key="r" @click="gForm.reason = r">{{ r }}</a></div>
				</a-form-item>
			</a-form>
			<div class="g-tip">这不是购买：不产生订单、不收费、不算成交和收入。客户下次打开小程序，这些视频就是「已购买」，能完整观看；买过的、已经开通的会自动跳过。要收回可以在「开通记录」里撤销。</div>
		</a-modal>

		<!-- 开通记录 -->
		<a-modal title="开通记录" :visible="rVisible" :width="900" :footer="null" @cancel="rVisible = false">
			<div class="r-bar">
				<a-radio-group v-model="rStatus" button-style="solid" size="small" @change="loadRecords(1)">
					<a-radio-button value="">全部</a-radio-button>
					<a-radio-button value="active">有效</a-radio-button>
					<a-radio-button value="revoked">已撤销</a-radio-button>
				</a-radio-group>
				<a-input-search v-model="rKeyword" size="small" allow-clear placeholder="客户编号 / 昵称 / 视频 / 原因" style="width: 220px; margin-left: 12px" @search="loadRecords(1)" />
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
import { flatten } from '@/utils/video';
import { getVideoOrders, getVideoTree, getVideoGrants, createVideoGrant, revokeVideoGrant, searchGrantCustomers } from '@/api';

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
			// 手动开通
			G_REASONS: ['付款异常补开通', '赠送客户', '内部测试', '会员福利'],
			gVisible: false, gSaving: false, gForm: { customerId: undefined, videoIds: [], reason: '' }, gCustomers: [], gSearched: false, gTimer: null, gCourses: [], gVideos: [],
			// 开通记录
			rVisible: false, rLoading: false, rStatus: '', rKeyword: '', rRows: [], rPage: { current: 1, pageSize: 10, total: 0, showTotal: (t) => `共 ${t} 条` },
			rColumns: [
				{ title: '客户', key: 'cust', scopedSlots: { customRender: 'cust' } },
				{ title: '视频', key: 'vid', scopedSlots: { customRender: 'vid' } },
				{ title: '原因', dataIndex: 'reason', key: 'reason' },
				{ title: '操作人 / 时间', key: 'by', width: 170, scopedSlots: { customRender: 'by' } },
				{ title: '状态', key: 'st', width: 130, scopedSlots: { customRender: 'st' } },
				{ title: '操作', key: 'act', width: 70, align: 'right', scopedSlots: { customRender: 'act' } }
			],
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
	watch: {
		// 在这个页面上点了通知铃铛里的视频订单：按订单号搜出这一单
		'$route.query.keyword'(v) { if (v) { this.keyword = String(v); this.search(); } }
	},
	mounted() {
		// 从通知铃铛点进来：带着订单号，直接只看这一单
		const k = this.$route && this.$route.query && this.$route.query.keyword;
		if (k) { this.keyword = String(k); this.applied = { ...this.applied, keyword: this.keyword }; }
		this.load();
	},
	methods: {
		timeText(t) { if (!t) return ''; const d = new Date(t); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }); },
		// ---- 手动开通 ----
		async openGrant() {
			this.gForm = { customerId: undefined, videoIds: [], reason: '' };
			this.gCustomers = []; this.gSearched = false; this.gVisible = true;
			try { // 视频列表：用视频管理的目录树摊平（课程、视频）
				const res = await getVideoTree();
				if (res.code === 0) { const f = flatten(res.data); this.gCourses = f.courses; this.gVideos = f.videos; }
			} catch (e) { notifyError(this, e, '获取视频列表失败'); }
		},
		searchCustomers(kw) {
			clearTimeout(this.gTimer);
			const k = String(kw || '').trim();
			if (!k) { this.gCustomers = []; this.gSearched = false; return; }
			this.gTimer = setTimeout(async () => {
				try { this.gCustomers = await searchGrantCustomers(k); } catch (e) { notifyError(this, e, '搜索客户失败'); }
				this.gSearched = true;
			}, 300);
		},
		addCourse(courseId) {
			const ids = this.gVideos.filter((v) => v.courseId === courseId).map((v) => v.id);
			this.gForm.videoIds = [...new Set([...this.gForm.videoIds, ...ids])];
		},
		async submitGrant() {
			const f = this.gForm;
			if (!f.customerId) return this.$message.warning('请选择客户');
			if (!f.videoIds.length) return this.$message.warning('请选择要开通的视频');
			if (!f.reason.trim()) return this.$message.warning('请填写开通原因');
			this.gSaving = true;
			try {
				const r = await createVideoGrant({ customerId: f.customerId, videoIds: f.videoIds, reason: f.reason.trim() });
				const n = (r.granted || []).length; const sk = r.skipped || [];
				if (n) this.$message.success(`已开通 ${n} 集${sk.length ? `，跳过 ${sk.length} 集（${sk[0].reason}）` : ''}`);
				else this.$message.warning(sk.length ? `没有新开通：${sk[0].reason}` : '没有新开通的');
				this.gVisible = false;
			} catch (e) { notifyError(this, e, '开通失败'); } finally { this.gSaving = false; }
		},
		// ---- 开通记录 ----
		openRecords() { this.rVisible = true; this.rStatus = ''; this.rKeyword = ''; this.loadRecords(1); },
		async loadRecords(page) {
			this.rLoading = true;
			try {
				const r = await getVideoGrants({ page, pageSize: this.rPage.pageSize, status: this.rStatus || undefined, keyword: this.rKeyword.trim() || undefined });
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
.g-quick { margin-top: 6px; color: #8c8c8c; font-size: 12px; }
.g-quick > a { margin-right: 12px; }
.g-tip { margin-top: 4px; padding: 8px 12px; background: #f4f8ff; border-radius: 6px; color: #595959; font-size: 12px; line-height: 1.7; }
.r-bar { margin-bottom: 12px; }
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
