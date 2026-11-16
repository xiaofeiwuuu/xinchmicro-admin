<template>
	<div>
		<a-card :bordered="false" class="mb-24 plain-card">
			<a-input v-model="customerId" placeholder="编号" style="width: 160px; margin-right: 12px;" allowClear @pressEnter="handleSearch" />
			<a-input v-model="nickname" placeholder="昵称" style="width: 160px; margin-right: 12px;" allowClear @pressEnter="handleSearch" />
			<a-input v-model="phone" placeholder="手机号" style="width: 160px; margin-right: 12px;" allowClear @pressEnter="handleSearch" />
			<!-- 溯源：教学视频画面上飘的那串 8 位码，输进来就能查出是哪个客户（已注销的也查得到） -->
			<a-input v-model="mark" placeholder="视频水印码" style="width: 160px; margin-right: 12px;" allowClear @pressEnter="handleSearch" />
			<a-select v-model="scope" style="width: 160px; margin-right: 12px;" @change="handleSearch">
				<a-select-option value="engaged">有资料或订单</a-select-option>
				<a-select-option value="all">全部访客</a-select-option>
			</a-select>
			<a-select v-model="member" placeholder="会员" style="width: 160px; margin-right: 12px;" allowClear @change="handleSearch">
				<a-select-option value="1">会员</a-select-option>
				<a-select-option value="0">非会员</a-select-option>
			</a-select>
			<a-select v-model="status" placeholder="状态" style="width: 160px; margin-right: 16px;" allowClear @change="handleSearch">
				<a-select-option value="active">正常</a-select-option>
				<a-select-option value="disabled">已拉黑</a-select-option>
				<a-select-option value="deleted">已注销</a-select-option>
			</a-select>
			<a-button type="primary" @click="handleSearch"><a-icon type="search" /> 搜索</a-button>
			<a-button style="margin-left: 8px;" @click="handleReset">重置</a-button>
		</a-card>

		<a-card :bordered="false" class="plain-card">
			<a-table :scroll="tableScroll"
				rowKey="id"
				:columns="columns"
				:dataSource="customers"
				:pagination="pagination"
				:loading="loading"
				@change="handleTableChange"
			>
				<template slot="avatar" slot-scope="text, record">
					<!-- 没设头像（或头像链接失效）显示默认头像，和小程序里的默认头像是同一张 -->
					<img :src="record.avatar || defaultAvatar" class="avatar" @error="onAvatarError" />
				</template>
				<template slot="nickname" slot-scope="text, record">
					<span v-if="text" class="copy-cell" title="点击复制" @click="copyName(text)">{{ text }}</span><span v-else>（未设置）</span><a-tag v-if="record.isMember" color="gold" style="margin-left: 8px;">会员</a-tag>
				</template>
				<template slot="phone" slot-scope="text">
					<span v-if="text" class="copy-cell" title="点击复制" @click="copyName(text)">{{ text }}</span><span v-else>-</span>
				</template>
				<template slot="remark" slot-scope="text">
					<a-tooltip v-if="text" :title="text"><span class="remark-cell">{{ text }}</span></a-tooltip>
					<span v-else style="color: #bfbfbf;">-</span>
				</template>
				<template slot="status" slot-scope="text">
					<a-tag :color="{ active: 'green', disabled: 'red', deleted: '' }[text]">{{ { active: '正常', disabled: '已拉黑', deleted: '已注销' }[text] }}</a-tag>
				</template>
				<template slot="action" slot-scope="text, record">
					<div class="row-actions">
						<a-button type="link" size="small" @click="openDetail(record.id)"><a-icon type="eye" style="color: #111827" /><span class="text-dark">详情</span></a-button>
						<!-- 备注、会员、拉黑都收进「更多」，和订单管理一致；各项按权限显示，一项都没有就不显示「更多」 -->
						<a-dropdown v-if="moreItems(record).length" :trigger="['click']" placement="bottomRight">
							<a-button type="link" size="small" @click.prevent><a-icon type="ellipsis" style="color: #111827" /><span class="text-dark">更多</span></a-button>
							<a-menu slot="overlay" @click="(e) => onMore(record, e.key)">
								<a-menu-item v-for="m in moreItems(record)" :key="m.key"><span :class="{ 'act-danger': m.danger }">{{ m.label }}</span></a-menu-item>
							</a-menu>
						</a-dropdown>
					</div>
				</template>
			</a-table>
		</a-card>

		<!-- 赠送视频：对这个客户手动开通视频（不是购买，不算成交） -->
		<grant-video-modal v-model="grantVisible" :customer="grantTarget" />

		<!-- 修改备注：详情只看不改，备注在列表里改 -->
		<a-modal v-model="remarkVisible" :title="'客户备注' + (remarkTarget ? '：' + (remarkTarget.nickname || '#' + remarkTarget.id) : '')" :width="520" okText="保存" :confirmLoading="remarkSaving" :destroyOnClose="true" @ok="saveRemark">
			<a-textarea v-model="remarkDraft" :rows="4" maxLength="500" placeholder="记录这个客户是谁、公司、采购习惯、联系情况等" />
			<div class="cd-remark-foot">
				<span class="cd-hint">只有后台能看到，客户看不到</span>
				<span class="cd-hint">{{ remarkDraft.length }} / 500</span>
			</div>
		</a-modal>

		<!-- 客户详情（只看不改）：摘要条（头像、状态、联系方式、时间、备注在最右、订单统计）→ 收货地址 → 发票抬头；没有底部按钮，点「订单数」查看这个客户的订单 -->
		<a-modal v-model="detailVisible" title="客户详情" :width="980" :footer="null" :destroyOnClose="true" :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px' }">
			<a-spin :spinning="detailLoading">
				<div v-if="detail" class="cd">
					<div class="cd-sum">
						<div class="cd-top">
						<div class="cd-who">
							<img :src="detail.avatar || defaultAvatar" class="avatar avatar-lg" @error="onAvatarError" />
							<div class="cd-who-text">
								<div class="cd-name">
									<span v-if="detail.nickname" class="copy-cell" title="点击复制" @click="copyName(detail.nickname)">{{ detail.nickname }}</span><span v-else>（未设置昵称）</span>
									<a-tag :color="{ active: 'green', disabled: 'red', deleted: '' }[detail.status]" class="cd-tag">{{ { active: '正常', disabled: '已拉黑', deleted: '已注销（个人信息已清除）' }[detail.status] }}</a-tag>
									<a-tag v-if="detail.isMember" color="gold" class="cd-tag">会员</a-tag>
								</div>
								<div class="cd-line"><span class="k">编号</span><span class="copy-cell" title="点击复制" @click="copyName('#' + detail.id)">#{{ detail.id }}</span></div>
								<div class="cd-line"><span class="k">手机号</span><span v-if="detail.phone" class="copy-cell" title="点击复制" @click="copyName(detail.phone)">{{ detail.phone }}</span><span v-else>未绑定</span></div>
								<div class="cd-line"><span class="k">最近登录</span>{{ detail.lastLoginAt || '-' }}</div>
								<div class="cd-line"><span class="k">视频水印码 <a-tooltip title="这个客户看教学视频时，画面上飘的就是这串码。录屏流出来的视频上看到这个码，就能在客户管理里查到是他。没看过视频的客户没有。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span><span v-if="detail.videoMark" class="copy-cell" title="点击复制" @click="copyName(detail.videoMark)">{{ detail.videoMark }}</span><span v-else>-</span></div>
							</div>
						</div>
						<div class="cd-times">
							<div class="cd-line"><span class="k">注册</span>{{ detail.createdAt }}</div>
							<div v-if="detail.isMember" class="cd-line"><span class="k">成为会员</span>{{ detail.memberSince || '-' }}</div>
						</div>
						<div class="cd-remarkbox">
							<div class="cd-remark-title">备注 <span class="cd-hint">只有后台能看到</span></div>
							<div v-if="detail.remark" class="cd-pre cd-remark-text">{{ detail.remark }}</div>
							<div v-else class="cd-empty">没有备注</div>
						</div>
						</div>
						<!-- 订单汇总：商品、视频各一行，下面是合计。点订单数跳到对应的订单页，只看这个客户。视频金额较敏感，没有「查看视频订单」权限的账号服务端不返回，那时只有商品一行 -->
						<div class="cs">
							<div class="cs-row cs-head">
								<span></span>
								<span class="cs-v">订单数</span>
								<span class="cs-v" title="不含已全额退款的订单">已付款订单</span>
								<span class="cs-v" title="已扣除退款">累计付款</span>
								<span class="cs-v">累计退款</span>
							</div>
							<div class="cs-row">
								<span class="cs-k"><i class="cs-dot goods"></i>商品</span>
								<span class="cs-v cs-link" title="点击查看这个客户的商品订单" @click="viewOrders">{{ detail.stats.orderCount }}</span>
								<span class="cs-v">{{ detail.stats.paidCount }}</span>
								<span class="cs-v">{{ money(detail.stats.paidAmount) }}</span>
								<span :class="['cs-v', { 'cs-refund': Number(detail.stats.refundedAmount) > 0 }]">{{ money(detail.stats.refundedAmount) }}</span>
							</div>
							<div v-if="detail.videoStats" class="cs-row">
								<span class="cs-k"><i class="cs-dot video"></i>视频<span v-if="detail.videoStats.grantCount" class="cs-sub">另有开通 {{ detail.videoStats.grantCount }} 集</span></span>
								<span class="cs-v cs-link" title="点击查看这个客户的视频订单" @click="viewVideoOrders">{{ detail.videoStats.orderCount }}</span>
								<span class="cs-v">{{ detail.videoStats.paidCount }}</span>
								<span class="cs-v">{{ money(detail.videoStats.paidAmount) }}</span>
								<span :class="['cs-v', { 'cs-refund': Number(detail.videoStats.refundedAmount) > 0 }]">{{ money(detail.videoStats.refundedAmount) }}</span>
							</div>
							<div v-if="detail.videoStats" class="cs-row cs-total">
								<span class="cs-k">合计</span>
								<span class="cs-v">{{ totals.orderCount }}</span>
								<span class="cs-v">{{ totals.paidCount }}</span>
								<span class="cs-v">{{ money(totals.paidAmount) }}</span>
								<span :class="['cs-v', { 'cs-refund': totals.refundedAmount > 0 }]">{{ money(totals.refundedAmount) }}</span>
							</div>
						</div>
					</div>

					<div class="cd-card">
						<div class="cd-title">收货地址（{{ detail.addresses.length }}）</div>
						<div v-if="!detail.addresses.length" class="cd-empty">客户还没有保存收货地址</div>
						<div v-else class="cd-grid">
							<div v-for="a in shownAddresses" :key="a.id" class="cd-tile">
								<div class="cd-tile-head"><span class="copy-cell" title="点击复制" @click="copyName(a.consignee)">{{ a.consignee }}</span>　<span class="copy-cell" title="点击复制" @click="copyName(a.phone)">{{ a.phone }}</span><a-tag v-if="a.isDefault" color="blue" class="cd-tag">默认</a-tag></div>
								<div class="cd-pre"><span class="copy-cell" title="点击复制" @click="copyName(a.region + ' ' + a.detail)">{{ a.region }} {{ a.detail }}</span></div>
							</div>
						</div>
						<div v-if="detail.addresses.length > FOLD" class="cd-fold"><a @click="showAllAddr = !showAllAddr">{{ showAllAddr ? '收起' : '展开全部（' + detail.addresses.length + '）' }}</a></div>
					</div>

					<div class="cd-card">
						<div class="cd-title">发票抬头（{{ (detail.invoiceTitles || []).length }}）</div>
						<div v-if="!detail.invoiceTitles || !detail.invoiceTitles.length" class="cd-empty">客户还没有添加发票抬头</div>
						<div v-else class="cd-grid">
							<div v-for="t in shownTitles" :key="t.id" class="cd-tile">
								<div class="cd-tile-head"><span class="copy-cell" title="点击复制" @click="copyName(t.title)">{{ t.title }}</span><a-tag v-if="t.kind === 'personal'" class="cd-tag">个人</a-tag><a-tag v-if="t.isDefault" color="blue" class="cd-tag">默认</a-tag></div>
								<div v-if="t.kind !== 'personal'" class="cd-line"><span class="k">税号</span><span class="copy-cell" title="点击复制" @click="copyName(t.taxId)">{{ t.taxId }}</span></div>
								<div v-if="t.address" class="cd-line"><span class="k">地址电话</span><span class="copy-cell" title="点击复制" @click="copyName(t.address + ' ' + t.phone)">{{ t.address }} {{ t.phone }}</span></div>
								<div v-if="t.bank" class="cd-line"><span class="k">开户行账号</span><span class="copy-cell" title="点击复制" @click="copyName(t.bank + ' ' + t.account)">{{ t.bank }} {{ t.account }}</span></div>
								<div v-if="t.kind === 'personal'" class="cd-warn">个人抬头，只能开普通发票</div>
								<div v-else-if="!(t.address && t.phone && t.bank && t.account)" class="cd-warn">信息不全，只能开普通发票</div>
							</div>
						</div>
						<div v-if="(detail.invoiceTitles || []).length > FOLD" class="cd-fold"><a @click="showAllTitles = !showAllTitles">{{ showAllTitles ? '收起' : '展开全部（' + detail.invoiceTitles.length + '）' }}</a></div>
					</div>
				</div>
			</a-spin>
			<!-- 操作按钮固定在弹窗底部 -->
		</a-modal>
	</div>
</template>

<script>
import IconEdit from '@/components/IconEdit.vue';
import GrantVideoModal from '@/components/GrantVideoModal.vue';
import { notifyError } from '@/utils/notify'
import { copyToClipboard } from '@/utils/copy'
import { getShopCustomers, getShopCustomer, setShopCustomerStatus, setShopCustomerRemark, setShopCustomerMember } from '@/api'
import { can } from '@/utils/auth'

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
	components: { IconEdit, GrantVideoModal },
	data() {
		return {
			FOLD: 2, // 收货地址、发票抬头默认只显示前 2 个，其余收起
			showAllAddr: false,
			showAllTitles: false,
			BLOCK_TIP: '拉黑后，这个微信号不能再使用小程序：打开只会看到「账号已被限制」页面，不能登录、下单、支付。',
			customerId: '',
			mark: '',
			nickname: '',
			phone: '',
			status: undefined,
			member: undefined,
			main: can('customer.member'), // 能不能设会员（会改变客户的价格）
			// 小程序一打开就自动登录，每个访客都有一条记录；默认只看有过动作的（填了资料、绑了手机、存了地址、下过单、被备注过）
			scope: 'engaged',
			grantVisible: false, grantTarget: null, // 赠送视频
			remarkVisible: false,
			remarkTarget: null,
			remarkDraft: '',
			remarkSaving: false,
			detailVisible: false,
			detailLoading: false,
			detail: null,
			loading: false,
			customers: [],
			pagination: newPagination(),
			defaultAvatar: require('@/assets/avatar-default.png'),
			sortOrder: '', // 订单数排序：'' 默认（新注册在前）/ descend / ascend
			baseColumns: [
				{ title: '编号', dataIndex: 'id', key: 'id', width: 80 },
				{ title: '头像', dataIndex: 'avatar', key: 'avatar', width: 80, scopedSlots: { customRender: 'avatar' } },
				{ title: '昵称', dataIndex: 'nickname', key: 'nickname', scopedSlots: { customRender: 'nickname' } },
				{ title: '手机号', dataIndex: 'phone', key: 'phone', scopedSlots: { customRender: 'phone' } },
				{ title: '备注', dataIndex: 'remark', key: 'remark', scopedSlots: { customRender: 'remark' } },
				{ title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 100, sorter: true, sortDirections: ['descend', 'ascend'] },
				{ title: '状态', dataIndex: 'status', key: 'status', width: 90, scopedSlots: { customRender: 'status' } },
				{ title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', customRender: (v) => v || '-' },
				{ title: '操作', key: 'action', align: 'right', width: 170, scopedSlots: { customRender: 'action' } }
			]
		}
	},
	created() {
		// 从日志里点客户过来：?id=编号，直接查这个人
		const q = (this.$route && this.$route.query) || {}
		if (q.id) this.customerId = String(q.id)
		this.fetch()
	},
	computed: {
		// 商品 + 视频的合计（金额按分相加，避免小数误差）
		totals() {
			const d = this.detail; const g = (d && d.stats) || {}; const v = (d && d.videoStats) || {};
			const fen = (x) => Math.round(Number(x || 0) * 100);
			return {
				orderCount: (g.orderCount || 0) + (v.orderCount || 0),
				paidCount: (g.paidCount || 0) + (v.paidCount || 0),
				paidAmount: (fen(g.paidAmount) + fen(v.paidAmount)) / 100,
				refundedAmount: (fen(g.refundedAmount) + fen(v.refundedAmount)) / 100
			};
		},
		// 订单数这一列的排序状态跟着 sortOrder 走（antd 的受控排序）
		columns() {
			return this.baseColumns.map((c) => (c.key === 'orderCount' ? { ...c, sortOrder: this.sortOrder || false } : c))
		},
		shownAddresses() {
			const l = (this.detail && this.detail.addresses) || []
			return this.showAllAddr ? l : l.slice(0, this.FOLD)
		},
		shownTitles() {
			const l = (this.detail && this.detail.invoiceTitles) || []
			return this.showAllTitles ? l : l.slice(0, this.FOLD)
		},
	},
	methods: {
		// 「更多」里的项：备注（要修改客户权限）、设为/取消会员（仅主账号）、拉黑/恢复（要修改客户权限，已注销的没有）
		moreItems(record) {
			const items = [];
			if (can('customer.edit')) items.push({ key: 'remark', label: '备注' });
			if (record.status !== 'deleted' && can('video.grant')) items.push({ key: 'grant', label: '赠送视频' }); // 不是购买，不算成交；已注销的客户不能开
			if (this.main) items.push({ key: 'member', label: record.isMember ? '取消会员' : '设为会员' });
			if (record.status !== 'deleted' && can('customer.edit')) items.push({ key: 'toggle', label: record.status === 'active' ? '拉黑' : '恢复', danger: record.status === 'active' });
			return items;
		},
		onMore(record, key) {
			if (key === 'remark') this.openRemark(record);
			else if (key === 'grant') { this.grantTarget = { id: record.id, nickname: record.nickname, phone: record.phone }; this.grantVisible = true; }
			else if (key === 'member') this.confirmMember(record);
			else if (key === 'toggle') this.confirmToggle(record);
		},
		// 头像链接失效（文件被删、过期）时退回默认头像；清掉 onerror 防止默认头像也加载失败时死循环
		onAvatarError(e) {
			const img = e.target
			if (img.src !== this.defaultAvatar) img.src = this.defaultAvatar
		},
		async copyName(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制：' + text)
			else this.$message.warning('复制失败，请手动复制')
		},
		async fetch() {
			try {
				this.loading = true
				const data = await getShopCustomers({ id: this.customerId.trim() || undefined, mark: this.mark.trim() || undefined, nickname: this.nickname.trim(), phone: this.phone.trim(), status: this.status, member: this.member, engaged: this.scope === 'engaged' ? '1' : undefined, page: this.pagination.current, pageSize: this.pagination.pageSize, sortBy: this.sortOrder ? 'orderCount' : undefined, order: this.sortOrder === 'ascend' ? 'asc' : this.sortOrder === 'descend' ? 'desc' : undefined })
				this.customers = data.list
				this.pagination.total = data.total
			} catch (error) {
				notifyError(this, error, '获取客户列表失败')
			} finally {
				this.loading = false
			}
		},
		handleSearch() {
			this.pagination.current = 1
			this.fetch()
		},
		// 重置：清空关键词和状态，范围回到默认的「有过操作的客户」
		handleReset() {
			this.customerId = ''
			this.mark = ''
			this.nickname = ''
			this.phone = ''
			this.status = undefined
			this.member = undefined
			this.scope = 'engaged'
			this.handleSearch()
		},
		// 表头点「订单数」：从大到小 → 从小到大 → 取消（回到默认的新注册在前）。排序在服务端按全部符合条件的客户做，不只是当前页
		handleTableChange(p, filters, sorter) {
			applyTableChange(this.pagination, p)
			const next = sorter && sorter.order ? sorter.order : ''
			if (next !== this.sortOrder) {
				this.sortOrder = next
				this.pagination.current = 1
			}
			this.fetch()
		},
		async openDetail(id) {
			this.detailVisible = true
			this.detail = null
			this.showAllAddr = false
			this.showAllTitles = false
			try {
				this.detailLoading = true
				this.detail = await getShopCustomer(id)
			} catch (error) {
				this.detailVisible = false
				notifyError(this, error, '获取客户详情失败')
			} finally {
				this.detailLoading = false
			}
		},
		openRemark(record) {
			this.remarkTarget = record
			this.remarkDraft = record.remark || ''
			this.remarkVisible = true
		},
		async saveRemark() {
			try {
				this.remarkSaving = true
				await setShopCustomerRemark(this.remarkTarget.id, this.remarkDraft.trim())
				this.remarkVisible = false
				this.$message.success('备注已保存')
				this.fetch()
			} catch (error) {
				notifyError(this, error, '保存备注失败')
			} finally {
				this.remarkSaving = false
			}
		},
		money(v) { return '¥' + Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
		viewVideoOrders() {
			this.$router.push({ path: '/video-orders', query: { keyword: '#' + this.detail.id } })
		},
		viewOrders() {
			this.$router.push({ path: '/shop/orders', query: { customerId: String(this.detail.id), name: this.detail.nickname || '' } })
		},
		// 设为会员 / 取消会员：弹出确认框（不用气泡），会改变这个客户以后买东西的价格，要说清楚影响
		confirmMember(record) {
			const next = !record.isMember
			const who = `客户「${record.nickname || '未设置昵称'}」`
			this.$confirm({
				title: next ? '设为会员？' : '取消会员？',
				content: next
					? `${who}升级成会员后，以后下单按产品的会员价（没设会员价的产品还是普通价）；已经下的订单价格不变。`
					: `${who}取消会员后，以后下单按普通价；已经下的订单价格不变。`,
				okText: next ? '设为会员' : '取消会员',
				okType: next ? 'primary' : 'danger',
				cancelText: '再想想',
				onOk: () => this.toggleMember(record)
			})
		},
		// 拉黑 / 恢复：同样弹出确认框
		confirmToggle(record) {
			const block = record.status === 'active'
			const who = `客户「${record.nickname || '未设置昵称'}」`
			this.$confirm({
				title: block ? '拉黑这个客户？' : '恢复这个客户？',
				content: block ? `${who}：${this.BLOCK_TIP}` : `${who}恢复后，这个微信号可以重新使用小程序。`,
				okText: block ? '拉黑' : '恢复',
				okType: block ? 'danger' : 'primary',
				cancelText: '再想想',
				onOk: () => this.toggle(record)
			})
		},
		async toggleMember(record) {
			const next = !record.isMember
			try {
				await setShopCustomerMember(record.id, next)
				this.$message.success(next ? '已升级成会员' : '已取消会员')
				this.fetch()
			} catch (error) {
				notifyError(this, error, '操作失败')
			}
		},
		async toggle(record) {
			const next = record.status === 'active' ? 'disabled' : 'active'
			try {
				await setShopCustomerStatus(record.id, next)
				this.$message.success(next === 'disabled' ? '已拉黑' : '已恢复')
				this.fetch()
			} catch (error) {
				notifyError(this, error, '操作失败')
			}
		}
	}
}
</script>

<style scoped>
.copy-cell { cursor: pointer; }
.copy-cell:hover { color: #1890ff; }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; }
.avatar-lg { width: 64px; height: 64px; font-size: 24px; flex-shrink: 0; }
.remark-cell { display: inline-block; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
.cd-sum { padding: 16px 20px; margin-bottom: 16px; background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; }
.cd-top { display: flex; justify-content: flex-start; align-items: flex-start; gap: 56px; }
.cd-remarkbox { margin-left: auto; width: 280px; flex-shrink: 0; box-sizing: border-box; padding: 10px 12px; background: #fafafa; border-radius: 6px; }
.cd-remark-title { font-weight: 600; line-height: 22px; margin-bottom: 2px; }
.cd-remark-text { max-height: 66px; overflow-y: auto; }
.cd-remarkbox .cd-empty { padding: 0; }
.cd-times { flex-shrink: 0; padding-top: 28px; } /* 28px = 昵称那一行的高度，让注册时间对齐手机号、成为会员对齐最近登录 */
.cd-who { display: flex; align-items: center; min-width: 0; }
.cd-who-text { margin-left: 16px; min-width: 0; }
.cd-name { font-size: 18px; font-weight: 600; line-height: 28px; }
.cd-tag { margin-left: 8px; vertical-align: 2px; }
.cd-line { line-height: 22px; font-size: 13px; color: #262626; }
.cd-line .k { display: inline-block; min-width: 56px; margin-right: 8px; color: #8c8c8c; }
/* 订单汇总：左边是类别，右边四列数字右对齐；合计行加粗、浅蓝底 */
.cs { margin-top: 14px; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; }
.cs-row { display: grid; grid-template-columns: 150px repeat(4, 1fr); align-items: center; min-height: 42px; padding: 0 16px; border-top: 1px solid #f5f5f5; }
.cs-row:first-child { border-top: 0; }
.cs-head { min-height: 34px; background: #fafafa; color: #8c8c8c; font-size: 12px; }
.cs-k { display: flex; align-items: center; color: #262626; font-weight: 500; }
.cs-dot { display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; }
.cs-dot.goods { background: #1890ff; }
.cs-dot.video { background: #722ed1; }
.cs-sub { margin-left: 8px; font-size: 12px; font-weight: 400; color: #8c8c8c; }
.cs-v { text-align: right; font-variant-numeric: tabular-nums; font-size: 15px; color: #262626; }
.cs-head .cs-v { font-size: 12px; color: #8c8c8c; }
.cs-link { cursor: pointer; color: #1890ff; font-weight: 600; }
.cs-link:hover { text-decoration: underline; }
.cs-refund { color: #cf1322; }
.cs-total { background: #f4f8ff; }
.cs-total .cs-k, .cs-total .cs-v { font-weight: 600; }
.cd-card { padding: 14px 16px 10px; margin-bottom: 14px; border: 1px solid #f0f0f0; border-radius: 8px; }
.cd-title { font-weight: 600; margin-bottom: 10px; }
.cd-hint { margin-left: 8px; font-size: 12px; font-weight: 400; color: #8c8c8c; }
.cd-remark-foot { display: flex; justify-content: space-between; align-items: center; margin: 8px 0 0; }
.cd-remark { padding-bottom: 6px; }
.cd-remark-foot .cd-hint { margin-left: 0; }
.cd-fold { text-align: center; padding: 4px 0 6px; }
.cd-empty { color: #bfbfbf; padding: 4px 0 8px; }
.cd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }
.cd-tile { padding: 10px 12px; background: #fafafa; border-radius: 6px; min-width: 0; }
.cd-tile-head { font-weight: 500; line-height: 24px; margin-bottom: 2px; word-break: break-all; }
.cd-pre { white-space: pre-wrap; color: #595959; font-size: 13px; line-height: 20px; word-break: break-all; }
.cd-warn { margin-top: 4px; font-size: 12px; color: #d46b08; }
.act-danger { color: #cf1322; }
</style>
