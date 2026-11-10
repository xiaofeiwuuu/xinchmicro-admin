<template>
	<div>
		<a-card :bordered="false" class="mb-24">
			<a-input v-model="nickname" placeholder="昵称" style="width: 160px; margin-right: 12px;" allowClear @pressEnter="handleSearch" />
			<a-input v-model="phone" placeholder="手机号" style="width: 160px; margin-right: 12px;" allowClear @pressEnter="handleSearch" />
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

		<a-card :bordered="false">
			<a-table :scroll="tableScroll"
				rowKey="id"
				:columns="columns"
				:dataSource="customers"
				:pagination="pagination"
				:loading="loading"
				@change="handleTableChange"
			>
				<template slot="avatar" slot-scope="text, record">
					<img v-if="record.avatar" :src="record.avatar" class="avatar" />
					<span v-else class="avatar avatar-empty">{{ (record.nickname || '客').slice(0, 1) }}</span>
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
						<a @click="openDetail(record.id)">详情</a>
						<a v-can="'customer.edit'" @click="openRemark(record)">备注</a>
						<a-popconfirm v-if="main" :overlayStyle="{ maxWidth: '260px' }" :title="record.isMember ? '取消会员后，这个客户以后下单按普通价；已经下的订单价格不变。确定吗？' : '升级成会员后，这个客户以后下单按产品的会员价（没设会员价的产品还是普通价）；已经下的订单价格不变。确定吗？'" @confirm="toggleMember(record)">
							<a>{{ record.isMember ? '取消会员' : '设为会员' }}</a>
						</a-popconfirm>
						<a-popconfirm
							v-if="record.status !== 'deleted'"
							v-can="'customer.edit'"
							:overlayStyle="{ maxWidth: '260px' }"
							:title="record.status === 'active' ? BLOCK_TIP : '确定恢复这个客户吗？'"
							@confirm="toggle(record)"
						>
							<a :style="{ color: record.status === 'active' ? '#ff4d4f' : '#1890ff' }">{{ record.status === 'active' ? '拉黑' : '恢复' }}</a>
						</a-popconfirm>
					</div>
				</template>
			</a-table>
		</a-card>

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
							<img v-if="detail.avatar" :src="detail.avatar" class="avatar avatar-lg" />
							<span v-else class="avatar avatar-lg avatar-empty">{{ (detail.nickname || '客').slice(0, 1) }}</span>
							<div class="cd-who-text">
								<div class="cd-name">
									<span v-if="detail.nickname" class="copy-cell" title="点击复制" @click="copyName(detail.nickname)">{{ detail.nickname }}</span><span v-else>（未设置昵称）</span>
									<a-tag :color="{ active: 'green', disabled: 'red', deleted: '' }[detail.status]" class="cd-tag">{{ { active: '正常', disabled: '已拉黑', deleted: '已注销（个人信息已清除）' }[detail.status] }}</a-tag>
									<a-tag v-if="detail.isMember" color="gold" class="cd-tag">会员</a-tag>
								</div>
								<div class="cd-line"><span class="k">手机号</span><span v-if="detail.phone" class="copy-cell" title="点击复制" @click="copyName(detail.phone)">{{ detail.phone }}</span><span v-else>未绑定</span></div>
								<div class="cd-line"><span class="k">最近登录</span>{{ detail.lastLoginAt || '-' }}</div>
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
						<div class="cd-nums">
							<div class="cd-num cd-num-link" title="点击查看这个客户的订单" @click="viewOrders"><div class="n">{{ detail.stats.orderCount }}</div><div class="l">订单数（点击查看订单）</div></div>
							<div class="cd-num"><div class="n">{{ detail.stats.paidCount }}</div><div class="l">已付款订单（不含已全额退款）</div></div>
							<div class="cd-num"><div class="n">¥{{ Number(detail.stats.paidAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div><div class="l">累计付款（已扣退款）</div></div>
							<div class="cd-num"><div class="n">¥{{ Number(detail.stats.refundedAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div><div class="l">累计退款</div></div>
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
import { notifyError } from '@/utils/notify'
import { copyToClipboard } from '@/utils/copy'
import { getShopCustomers, getShopCustomer, setShopCustomerStatus, setShopCustomerRemark, setShopCustomerMember } from '@/api'
import { can } from '@/utils/auth'

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
	data() {
		return {
			FOLD: 2, // 收货地址、发票抬头默认只显示前 2 个，其余收起
			showAllAddr: false,
			showAllTitles: false,
			BLOCK_TIP: '拉黑后，这个微信号不能再使用小程序：打开只会看到「账号已被限制」页面，不能登录、下单、支付。确定吗？',
			nickname: '',
			phone: '',
			status: undefined,
			member: undefined,
			main: can('customer.member'), // 能不能设会员（会改变客户的价格）
			// 小程序一打开就自动登录，每个访客都有一条记录；默认只看有过动作的（填了资料、绑了手机、存了地址、下过单、被备注过）
			scope: 'engaged',
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
			sortOrder: '', // 订单数排序：'' 默认（新注册在前）/ descend / ascend
			baseColumns: [
				{ title: '头像', dataIndex: 'avatar', key: 'avatar', scopedSlots: { customRender: 'avatar' } },
				{ title: '昵称', dataIndex: 'nickname', key: 'nickname', scopedSlots: { customRender: 'nickname' } },
				{ title: '手机号', dataIndex: 'phone', key: 'phone', scopedSlots: { customRender: 'phone' } },
				{ title: '备注', dataIndex: 'remark', key: 'remark', scopedSlots: { customRender: 'remark' } },
				{ title: '订单数', dataIndex: 'orderCount', key: 'orderCount', sorter: true, sortDirections: ['descend', 'ascend'] },
				{ title: '状态', dataIndex: 'status', key: 'status', scopedSlots: { customRender: 'status' } },
				{ title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', customRender: (v) => v || '-' },
				{ title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
			]
		}
	},
	created() {
		this.fetch()
	},
	computed: {
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
		async copyName(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制：' + text)
			else this.$message.warning('复制失败，请手动复制')
		},
		async fetch() {
			try {
				this.loading = true
				const data = await getShopCustomers({ nickname: this.nickname.trim(), phone: this.phone.trim(), status: this.status, member: this.member, engaged: this.scope === 'engaged' ? '1' : undefined, page: this.pagination.current, pageSize: this.pagination.pageSize, sortBy: this.sortOrder ? 'orderCount' : undefined, order: this.sortOrder === 'ascend' ? 'asc' : this.sortOrder === 'descend' ? 'desc' : undefined })
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
		viewOrders() {
			this.$router.push({ path: '/shop/orders', query: { customerId: String(this.detail.id), name: this.detail.nickname || '' } })
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
.avatar-empty { background: #e6f4ff; color: #1677ff; font-weight: 600; }
.row-actions { gap: 4px 14px; }
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
.cd-nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #f0f0f0; }
.cd-num { text-align: center; }
.cd-num-link { cursor: pointer; }
.cd-num-link:hover .n, .cd-num-link:hover .l { color: #1890ff; }
.cd-num .n { font-size: 24px; font-weight: 600; line-height: 34px; color: #262626; }
.cd-num .l { font-size: 12px; color: #8c8c8c; }
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
</style>
