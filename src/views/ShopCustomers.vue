<template>
	<div>
		<a-card :bordered="false" class="mb-24">
			<a-input-search
				v-model="keyword"
				placeholder="搜索昵称、手机号或备注"
				style="width: 240px; margin-right: 16px;"
				allowClear
				@search="handleSearch"
			/>
			<a-select v-model="scope" style="width: 190px; margin-right: 16px;" @change="handleSearch">
				<a-select-option value="engaged">有资料或订单的客户</a-select-option>
				<a-select-option value="all">全部访客（含只打开过的）</a-select-option>
			</a-select>
			<a-select v-model="status" placeholder="状态" style="width: 120px; margin-right: 16px;" allowClear @change="handleSearch">
				<a-select-option value="active">正常</a-select-option>
				<a-select-option value="disabled">已拉黑</a-select-option>
			</a-select>
			<a-button type="primary" @click="handleSearch"><a-icon type="search" /> 搜索</a-button>
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
				<template slot="nickname" slot-scope="text">{{ text || '（未设置）' }}</template>
				<template slot="remark" slot-scope="text">
					<a-tooltip v-if="text" :title="text"><span class="remark-cell">{{ text }}</span></a-tooltip>
					<span v-else style="color: #bfbfbf;">-</span>
				</template>
				<template slot="status" slot-scope="text">
					<a-tag :color="text === 'active' ? 'green' : 'red'">{{ text === 'active' ? '正常' : '已拉黑' }}</a-tag>
				</template>
				<template slot="action" slot-scope="text, record">
					<a style="margin-right: 12px;" @click="openDetail(record.id)">详情</a>
					<a-popconfirm
						:title="record.status === 'active' ? BLOCK_TIP : '确定恢复这个客户吗？'"
						@confirm="toggle(record)"
					>
						<a :style="{ color: record.status === 'active' ? '#ff4d4f' : '#1890ff' }">{{ record.status === 'active' ? '拉黑' : '恢复' }}</a>
					</a-popconfirm>
				</template>
			</a-table>
		</a-card>

		<!-- 客户详情 -->
		<a-modal v-model="detailVisible" title="客户详情" :footer="null" :width="680" :destroyOnClose="true">
			<a-spin :spinning="detailLoading">
				<div v-if="detail" class="cd">
					<div class="cd-head">
						<img v-if="detail.avatar" :src="detail.avatar" class="avatar avatar-lg" />
						<span v-else class="avatar avatar-lg avatar-empty">{{ (detail.nickname || '客').slice(0, 1) }}</span>
						<div class="cd-head-text">
							<div class="cd-name">{{ detail.nickname || '（未设置昵称）' }}
								<a-tag :color="detail.status === 'active' ? 'green' : 'red'" style="margin-left: 8px;">{{ detail.status === 'active' ? '正常' : '已拉黑' }}</a-tag>
							</div>
							<div class="cd-sub">手机号：{{ detail.phone || '未绑定' }}</div>
							<div class="cd-sub">注册：{{ detail.createdAt }}　最近登录：{{ detail.lastLoginAt || '-' }}</div>
						</div>
					</div>

					<a-row :gutter="16" class="cd-stats">
						<a-col :span="8"><a-statistic title="订单数" :value="detail.stats.orderCount" /></a-col>
						<a-col :span="8"><a-statistic title="已付款订单" :value="detail.stats.paidCount" /></a-col>
						<a-col :span="8"><a-statistic title="累计付款（元）" :value="detail.stats.paidAmount" :precision="2" /></a-col>
					</a-row>

					<div class="cd-title">备注（只有后台能看到，客户看不到）</div>
					<a-textarea v-model="remarkDraft" :rows="2" maxLength="500" placeholder="记录这个客户是谁、公司、采购习惯、联系情况等" />
					<div style="margin-top: 8px;">
						<a-button size="small" type="primary" :loading="remarkSaving" :disabled="remarkDraft.trim() === (detail.remark || '')" @click="saveRemark">保存备注</a-button>
					</div>

					<div class="cd-title">收货地址（{{ detail.addresses.length }}）</div>
					<div v-if="!detail.addresses.length" class="cd-empty">客户还没有保存收货地址</div>
					<div v-for="a in detail.addresses" :key="a.id" class="cd-card">
						<div>{{ a.consignee }}　{{ a.phone }} <a-tag v-if="a.isDefault" color="blue">默认</a-tag></div>
						<div class="cd-pre">{{ a.region }} {{ a.detail }}</div>
					</div>

					<div class="cd-title">开票信息</div>
					<div v-if="!detail.invoiceInfo" class="cd-empty">客户还没有填写开票信息</div>
					<div v-else class="cd-card">
						<div>{{ INVOICE_TYPE[detail.invoiceInfo.type] }}</div>
						<div>抬头：{{ detail.invoiceInfo.title }}　税号：{{ detail.invoiceInfo.taxId }}</div>
						<div v-if="detail.invoiceInfo.address">地址电话：{{ detail.invoiceInfo.address }} {{ detail.invoiceInfo.phone }}</div>
						<div v-if="detail.invoiceInfo.bank">开户行账号：{{ detail.invoiceInfo.bank }} {{ detail.invoiceInfo.account }}</div>
						<div>邮箱：{{ detail.invoiceInfo.email }}</div>
					</div>

					<a-divider />
					<a-button type="primary" @click="viewOrders">查看这个客户的订单</a-button>
					<a-popconfirm :title="detail.status === 'active' ? BLOCK_TIP : '确定恢复这个客户吗？'" @confirm="toggle(detail)">
						<a-button :type="detail.status === 'active' ? 'danger' : 'default'" ghost style="margin-left: 8px;">{{ detail.status === 'active' ? '拉黑这个客户' : '恢复这个客户' }}</a-button>
					</a-popconfirm>
				</div>
			</a-spin>
		</a-modal>
	</div>
</template>

<script>
import { notifyError } from '@/utils/notify'
import { getShopCustomers, getShopCustomer, setShopCustomerStatus, setShopCustomerRemark } from '@/api'
import { INVOICE_TYPE } from '@/utils/shop'

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
	data() {
		return {
			INVOICE_TYPE,
			BLOCK_TIP: '拉黑后，这个微信号不能再使用小程序：打开只会看到「账号已被限制」页面，不能登录、下单、支付。确定吗？',
			keyword: '',
			status: undefined,
			// 小程序一打开就自动登录，每个访客都有一条记录；默认只看有过动作的（填了资料、绑了手机、存了地址、下过单、被备注过）
			scope: 'engaged',
			remarkDraft: '',
			remarkSaving: false,
			detailVisible: false,
			detailLoading: false,
			detail: null,
			loading: false,
			customers: [],
			pagination: newPagination(),
			columns: [
				{ title: '头像', dataIndex: 'avatar', key: 'avatar', scopedSlots: { customRender: 'avatar' } },
				{ title: '昵称', dataIndex: 'nickname', key: 'nickname', scopedSlots: { customRender: 'nickname' } },
				{ title: '手机号', dataIndex: 'phone', key: 'phone', customRender: (v) => v || '-' },
				{ title: '备注', dataIndex: 'remark', key: 'remark', scopedSlots: { customRender: 'remark' } },
				{ title: '订单数', dataIndex: 'orderCount', key: 'orderCount' },
				{ title: '状态', dataIndex: 'status', key: 'status', scopedSlots: { customRender: 'status' } },
				{ title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', customRender: (v) => v || '-' },
				{ title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
			]
		}
	},
	created() {
		this.fetch()
	},
	methods: {
		async fetch() {
			try {
				this.loading = true
				const data = await getShopCustomers({ keyword: this.keyword.trim(), status: this.status, engaged: this.scope === 'engaged' ? '1' : undefined, page: this.pagination.current, pageSize: this.pagination.pageSize })
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
		handleTableChange(p) {
			applyTableChange(this.pagination, p)
			this.fetch()
		},
		async openDetail(id) {
			this.detailVisible = true
			this.detail = null
			try {
				this.detailLoading = true
				this.detail = await getShopCustomer(id)
				this.remarkDraft = this.detail.remark || ''
			} catch (error) {
				this.detailVisible = false
				notifyError(this, error, '获取客户详情失败')
			} finally {
				this.detailLoading = false
			}
		},
		async saveRemark() {
			try {
				this.remarkSaving = true
				const res = await setShopCustomerRemark(this.detail.id, this.remarkDraft.trim())
				this.detail.remark = res.remark
				this.remarkDraft = res.remark
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
		async toggle(record) {
			const next = record.status === 'active' ? 'disabled' : 'active'
			try {
				await setShopCustomerStatus(record.id, next)
				this.$message.success(next === 'disabled' ? '已拉黑' : '已恢复')
				if (this.detail && this.detail.id === record.id) this.detail.status = next
				this.fetch()
			} catch (error) {
				notifyError(this, error, '操作失败')
			}
		}
	}
}
</script>

<style scoped>
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; }
.avatar-lg { width: 64px; height: 64px; font-size: 24px; flex-shrink: 0; }
.avatar-empty { background: #e6f4ff; color: #1677ff; font-weight: 600; }
.remark-cell { display: inline-block; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
.cd-head { display: flex; align-items: center; margin-bottom: 16px; }
.cd-head-text { margin-left: 16px; }
.cd-name { font-size: 18px; font-weight: 600; }
.cd-sub { color: #8c8c8c; margin-top: 2px; }
.cd-stats { margin-bottom: 8px; }
.cd-title { font-weight: 600; margin: 16px 0 8px; }
.cd-empty { color: #8c8c8c; }
.cd-card { padding: 10px 12px; border: 1px solid #f0f0f0; border-radius: 6px; margin-bottom: 8px; }
.cd-pre { white-space: pre-wrap; color: #595959; }
</style>
