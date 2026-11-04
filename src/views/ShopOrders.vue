<template>
	<div>
		<a-card :bordered="false" class="mb-24">
			<a-tag v-if="customerId" closable color="blue" style="margin-right: 16px; padding: 4px 8px;" @close="clearCustomer">客户：{{ customerName || '#' + customerId }}</a-tag>
			<a-input-search
				v-model="filters.keyword"
				placeholder="订单号 / 收货人 / 电话"
				style="width: 240px; margin-right: 16px;"
				allowClear
				@search="handleSearch"
			/>
			<a-select v-model="filters.status" placeholder="订单状态" style="width: 130px; margin-right: 16px;" allowClear @change="handleSearch">
				<a-select-option v-for="(v, k) in ORDER_STATUS" :key="k" :value="k">{{ v.text }}</a-select-option>
			</a-select>
			<a-select v-model="filters.invoice" placeholder="开票状态" style="width: 120px; margin-right: 16px;" allowClear @change="handleSearch">
				<a-select-option v-for="(v, k) in INVOICE_STATUS" :key="k" :value="k">{{ v.text }}</a-select-option>
			</a-select>
			<span style="margin-right: 16px;">
				<a-switch v-model="filters.refundPending" size="small" @change="handleSearch" /> 只看需要退款
			</span>
			<a-button type="primary" @click="handleSearch"><a-icon type="search" /> 搜索</a-button>
		</a-card>

		<a-card :bordered="false">
			<a-table :scroll="tableScroll" rowKey="id" :columns="columns" :dataSource="orders" :pagination="pagination" :loading="loading" @change="handleTableChange">
				<template slot="customer" slot-scope="text, record">
					{{ (record.customer && record.customer.nickname) || '（未设置）' }}
					<div style="color: #8c8c8c; font-size: 12px;">{{ record.customer && record.customer.phone }}</div>
				</template>
				<template slot="receiver" slot-scope="text, record">
					{{ record.address.consignee }}
					<div style="color: #8c8c8c; font-size: 12px;">{{ record.address.phone }}</div>
				</template>
				<template slot="amount" slot-scope="text">{{ money(text) }}</template>
				<template slot="status" slot-scope="text, record">
					<a-tag :color="ORDER_STATUS[text].color">{{ ORDER_STATUS[text].text }}</a-tag>
					<a-tag v-if="record.refundPending" color="red">需要退款</a-tag>
				</template>
				<template slot="invoice" slot-scope="text">
					<a-tag :color="INVOICE_STATUS[text].color">{{ INVOICE_STATUS[text].text }}</a-tag>
				</template>
				<template slot="action" slot-scope="text, record">
					<div class="row-actions">
						<a @click="openDetail(record.id)">详情</a>
						<!-- 常用操作直接放在列表里，不用先打开详情；不同状态显示不同的按钮 -->
						<a v-if="record.status === 'pending_ship'" @click="quickAction(record, 'ship')">发货</a>
						<a v-if="record.refundPending" class="act-danger" @click="quickAction(record, 'refunded')">标记已退款</a>
						<a v-if="record.invoiceStatus === 'requesting'" @click="quickAction(record, 'issue')">开发票</a>
						<a v-if="['pending_payment', 'pending_ship'].includes(record.status)" class="act-danger" @click="quickAction(record, 'cancel')">取消</a>
					</div>
				</template>
			</a-table>
		</a-card>

		<!-- 订单详情 -->
		<a-modal v-model="detailVisible" :title="detail ? '订单 ' + detail.orderNo : '订单详情'" :footer="null" :width="760" :destroyOnClose="true">
			<a-spin :spinning="detailLoading">
				<div v-if="detail" class="order-detail">
					<div class="od-head">
						<a-tag :color="ORDER_STATUS[detail.status].color" style="font-size: 14px; padding: 2px 10px;">{{ ORDER_STATUS[detail.status].text }}</a-tag>
						<a-tag v-if="detail.refundPending" color="red">需要退款</a-tag>
						<span class="od-total">{{ money(detail.totalAmount) }}</span>
						<span v-if="detail.paidBy" class="od-sub">已付款 · {{ PAID_BY[detail.paidBy] }}</span>
					</div>

					<a-alert v-if="detail.refundPending" type="error" show-icon style="margin-bottom: 16px;"
						message="这个订单有一笔微信付款需要退还给客户。系统会自动向微信申请退款（见下方操作记录）；如果多次失败，请到微信商户平台手动退款，再点「标记已退款」。" />

					<div class="od-block">
						<div class="od-title">商品</div>
						<table class="od-table">
							<tr><th>名称</th><th style="width: 100px;">单价</th><th style="width: 70px;">数量</th><th style="width: 110px;">小计</th></tr>
							<tr v-for="i in detail.items" :key="i.productId">
								<td>{{ i.name }}</td><td>{{ money(i.price) }}</td><td>{{ i.qty }}</td><td>{{ money(i.subtotal) }}</td>
							</tr>
						</table>
					</div>

					<a-row :gutter="24">
						<a-col :span="12">
							<div class="od-block">
								<div class="od-title">客户</div>
								<div>{{ (detail.customer && detail.customer.nickname) || '（未设置）' }}　{{ detail.customer && detail.customer.phone }}</div>
							</div>
							<div class="od-block">
								<div class="od-title">收货信息</div>
								<div>{{ detail.address.consignee }}　{{ detail.address.phone }}</div>
								<div class="od-pre">{{ detail.address.region }} {{ detail.address.detail }}</div>
								<div v-if="detail.remark" class="od-pre" style="color: #8c8c8c;">备注：{{ detail.remark }}</div>
							</div>
						</a-col>
						<a-col :span="12">
							<div v-if="detail.expressNo" class="od-block">
								<div class="od-title">物流</div>
								<div>{{ detail.expressCompany }}　{{ detail.expressNo }}</div>
							</div>
							<div v-if="detail.invoiceStatus !== 'none'" class="od-block">
								<div class="od-title">发票 <a-tag :color="INVOICE_STATUS[detail.invoiceStatus].color">{{ INVOICE_STATUS[detail.invoiceStatus].text }}</a-tag></div>
								<div v-if="detail.invoice">
									<div>{{ INVOICE_TYPE[detail.invoice.type] }}</div>
									<div>抬头：{{ detail.invoice.title }}</div>
									<div>税号：{{ detail.invoice.taxId }}</div>
									<div v-if="detail.invoice.address">地址电话：{{ detail.invoice.address }} {{ detail.invoice.phone }}</div>
									<div v-if="detail.invoice.bank">开户行账号：{{ detail.invoice.bank }} {{ detail.invoice.account }}</div>
									<div v-if="detail.invoice.email">邮箱：{{ detail.invoice.email }}</div>
								</div>
								<div v-if="detail.invoiceNo">发票号码：{{ detail.invoiceNo }}</div>
								<div v-if="detail.invoiceStatus === 'issued'">
									发票文件：
									<template v-if="detail.invoiceFileID">
										<a @click="openInvoiceFile(detail.invoiceFileID)">{{ detail.invoiceFile && detail.invoiceFile.name }}</a>
										<span class="od-sub">客户可在小程序里下载</span>
									</template>
									<span v-else class="od-sub">还没有上传，客户在小程序里下载不到发票</span>
								</div>
							</div>
						</a-col>
					</a-row>

					<div class="od-block">
						<div class="od-title">操作记录</div>
						<div v-for="l in detail.logs" :key="l.id" class="od-log">
							<span class="od-log-time">{{ l.createdAt }}</span>
							<a-tag>{{ ACTOR[l.actorType] }}</a-tag>
							<span>{{ LOG_ACTION[l.action] || l.action }}</span>
							<span v-if="l.note" class="od-log-note">{{ l.note }}</span>
						</div>
					</div>

					<a-divider />
					<div class="od-actions">
						<a-button v-if="detail.status === 'pending_ship'" type="primary" @click="openAction('ship')">发货</a-button>
						<a-button v-if="detail.invoiceStatus === 'requesting'" type="primary" ghost @click="openAction('issue')">开具发票</a-button>
						<a-button v-if="detail.invoiceStatus === 'requesting'" @click="openAction('reject')">驳回开票申请</a-button>
						<a-button v-if="detail.invoiceStatus === 'issued'" type="primary" ghost @click="openAction('invoicefile')">{{ detail.invoiceFileID ? '替换发票文件' : '上传发票文件' }}</a-button>
						<a-button v-if="detail.refundPending" @click="openAction('refunded')">标记已退款</a-button>
						<a-button v-if="canCancel" type="danger" ghost @click="openAction('cancel')">取消订单</a-button>
					</div>
				</div>
			</a-spin>
		</a-modal>

		<!-- 操作确认 -->
		<a-modal v-model="actionVisible" :title="ACTIONS[action.type] && ACTIONS[action.type].title" :confirmLoading="acting" okText="确定" cancelText="取消" :okButtonProps="{ props: { disabled: uploadingFile } }" @ok="submitAction" @cancel="discardUploaded">
			<template v-if="action.type === 'ship'">
				<div v-if="detail" class="ship-sum">
					<div>订单 {{ detail.orderNo }}　{{ money(detail.totalAmount) }}</div>
					<template v-if="detail.address">
						<div>收货人：{{ detail.address.consignee }}　{{ detail.address.phone }}</div>
						<div>地址：{{ detail.address.region }} {{ detail.address.detail }}</div>
					</template>
				</div>
				<a-select v-model="action.carrier" placeholder="选择快递公司" style="width: 100%; margin-bottom: 12px;">
					<a-select-option v-for="c in CARRIERS" :key="c" :value="c">{{ c }}</a-select-option>
					<a-select-option :value="OTHER_CARRIER">其他（手动填写）</a-select-option>
				</a-select>
				<a-input v-if="action.carrier === OTHER_CARRIER" v-model="action.customCarrier" maxLength="50" placeholder="快递公司名称" style="margin-bottom: 12px;" />
				<a-input v-model="action.expressNo" maxLength="50" placeholder="运单号" @pressEnter="submitAction" />
			</template>
			<template v-else-if="action.type === 'cancel'">
				<a-alert v-if="detail && detail.paidBy" type="warning" show-icon style="margin-bottom: 12px;"
					:message="'这个订单已经用微信支付付款，取消后会自动向微信申请全额退款（原路退回给客户）。'" />
				<a-textarea v-model="action.reason" :rows="3" maxLength="100" placeholder="取消原因（必填，客户能看到）" />
			</template>
			<template v-else-if="action.type === 'issue'">
				<div v-if="detail && detail.invoice" class="ship-sum">
					<div>{{ INVOICE_TYPE[detail.invoice.type] }}　{{ detail.invoice.title }}</div>
					<div>税号：{{ detail.invoice.taxId }}</div>
				</div>
				<a-input v-model="action.invoiceNo" maxLength="50" placeholder="发票号码（财务在税务系统开具后填写）" style="margin-bottom: 12px;" />
				<pdf-uploader :value="action.file" @change="(f) => (action.file = f)" button-text="上传电子发票（PDF，可选）" :removable="true" @uploading="(v) => (uploadingFile = v)" />
				<div class="od-sub" style="margin: 8px 0 0;">上传后客户可以在小程序订单里直接下载；不上传也能开具，之后可以补传。</div>
			</template>
			<template v-else-if="action.type === 'invoicefile'">
				<pdf-uploader :value="action.file" @change="(f) => (action.file = f)" button-text="选择发票文件（PDF）" :removable="true" @uploading="(v) => (uploadingFile = v)" />
				<div class="od-sub" style="margin: 8px 0 0;">替换后客户下载到的就是新文件，旧文件会从云存储删除。</div>
			</template>
			<template v-else-if="action.type === 'reject'">
				<a-textarea v-model="action.reason" :rows="3" maxLength="200" placeholder="驳回原因（如：税号不对），客户修改开票信息后可以重新申请" />
			</template>
			<template v-else-if="action.type === 'refunded'">
				<p>确认已经在微信商户平台把款项退还给客户？确认后会去掉「需要退款」标记。</p>
				<a-textarea v-model="action.note" :rows="2" maxLength="200" placeholder="备注（可选）" />
			</template>
		</a-modal>
	</div>
</template>

<script>
import { notifyError } from '@/utils/notify'
import PdfUploader from '@/components/PdfUploader.vue'
import { getShopOrders, getShopOrder, shipShopOrder, cancelShopOrder, markShopOrderRefunded, issueShopInvoice, rejectShopInvoice, setShopInvoiceFile, getPdfDownloadUrl, deletePdfs } from '@/api'
import { ORDER_STATUS, INVOICE_STATUS, INVOICE_TYPE, PAID_BY, LOG_ACTION, ACTOR, money } from '@/utils/shop'

// 常用快递公司（发货时下拉选择；没有的选「其他」手动填）
const CARRIERS = ['顺丰速运', '中通快递', '圆通速递', '申通快递', '韵达快递', '极兔速递', '京东物流', '德邦快递', 'EMS', '邮政包裹']
const OTHER_CARRIER = '__other__'
const LAST_CARRIER_KEY = 'shipCarrier'
const lastCarrier = () => { try { return localStorage.getItem(LAST_CARRIER_KEY) || '' } catch (e) { return '' } }
const rememberCarrier = (c) => { try { localStorage.setItem(LAST_CARRIER_KEY, c) } catch (e) { /* 存不了就算了 */ } }

const ACTIONS = {
	ship: { title: '发货' },
	cancel: { title: '取消订单' },
	issue: { title: '开具发票' },
	invoicefile: { title: '发票文件' },
	reject: { title: '驳回开票申请' },
	refunded: { title: '标记已退款' }
}

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
	components: { PdfUploader },
	data() {
		return {
			uploadingFile: false,
			ORDER_STATUS, INVOICE_STATUS, INVOICE_TYPE, PAID_BY, LOG_ACTION, ACTOR, ACTIONS, CARRIERS, OTHER_CARRIER,
			filters: { keyword: '', status: undefined, invoice: undefined, refundPending: false },
			// 从「客户管理 → 查看订单」进来时按这个客户筛选
			customerId: this.$route.query.customerId || '',
			customerName: this.$route.query.name || '',
			loading: false,
			orders: [],
			pagination: newPagination(),
			columns: [
				{ title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
				{ title: '客户', key: 'customer', scopedSlots: { customRender: 'customer' } },
				{ title: '收货人', key: 'receiver', scopedSlots: { customRender: 'receiver' } },
				{ title: '金额', dataIndex: 'totalAmount', key: 'totalAmount', scopedSlots: { customRender: 'amount' } },
				{ title: '状态', dataIndex: 'status', key: 'status', scopedSlots: { customRender: 'status' } },
				{ title: '开票', dataIndex: 'invoiceStatus', key: 'invoiceStatus', scopedSlots: { customRender: 'invoice' } },
				{ title: '下单时间', dataIndex: 'createdAt', key: 'createdAt' },
				{ title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
			],
			detailVisible: false,
			detailLoading: false,
			detail: null,
			actionVisible: false,
			acting: false,
			action: { type: '' }
		}
	},
	computed: {
		canCancel() {
			return this.detail && ['pending_payment', 'pending_ship'].includes(this.detail.status)
		}
	},
	created() {
		this.fetch()
	},
	methods: {
		money,
		async fetch() {
			try {
				this.loading = true
				const f = this.filters
				const data = await getShopOrders({
					customerId: this.customerId || undefined, keyword: f.keyword.trim(), status: f.status, invoice: f.invoice,
					refundPending: f.refundPending ? 'true' : undefined,
					page: this.pagination.current, pageSize: this.pagination.pageSize
				})
				this.orders = data.list
				this.pagination.total = data.total
			} catch (error) {
				notifyError(this, error, '获取订单列表失败')
			} finally {
				this.loading = false
			}
		},
		handleSearch() {
			this.pagination.current = 1
			this.fetch()
		},
		clearCustomer() {
			this.customerId = ''
			this.customerName = ''
			this.$router.replace({ path: '/shop/orders' })
			this.handleSearch()
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
				this.detail = await getShopOrder(id)
			} catch (error) {
				this.detailVisible = false
				notifyError(this, error, '获取订单详情失败')
			} finally {
				this.detailLoading = false
			}
		},
		openAction(type) {
			const last = lastCarrier()
			// 上次用的快递公司默认选上（常发一家的话少点一次）
			this.action = { type, note: '', reason: '', carrier: CARRIERS.includes(last) ? last : undefined, customCarrier: '', expressNo: '', invoiceNo: '', file: null }
			this.uploadingFile = false
			this.actionVisible = true
		},
		// 发票文件是云存储文件：取一个临时链接再打开。先开空白窗口再改地址，避免异步请求后被浏览器当成弹窗拦截
		async openInvoiceFile(fileID) {
			const win = window.open('', '_blank')
			try {
				const res = await getPdfDownloadUrl(fileID)
				const url = res && res.file_list && res.file_list[0] && res.file_list[0].download_url
				if (!url) throw new Error('没有取到文件链接')
				if (win) win.location.href = url
			} catch (error) {
				if (win) win.close()
				notifyError(this, error, '打开发票文件失败')
			}
		},
		// 取消弹窗时，本次新传、还没保存的发票文件要清掉（保存成功后 file 已经和订单关联，不会走到这里）
		discardUploaded() {
			const f = this.action && this.action.file
			if (f && f.fileID) deletePdfs([f.fileID])
		},
		// 列表里直接操作（发货、取消、标记已退款、开发票）：不用先打开详情
		quickAction(record, type) {
			this.detail = record
			this.openAction(type)
		},
		async submitAction() {
			const a = this.action
			const id = this.detail.id
			const need = (v, msg) => { if (!String(v || '').trim()) { this.$message.warning(msg); return false } return true }
			let call
			if (a.type === 'ship') {
				const company = a.carrier === OTHER_CARRIER ? String(a.customCarrier || '').trim() : a.carrier
				if (!need(a.carrier, '请选择快递公司') || !need(company, '请填写快递公司名称') || !need(a.expressNo, '请填写运单号')) return
				call = () => shipShopOrder(id, { expressCompany: company, expressNo: a.expressNo.trim() })
			} else if (a.type === 'cancel') {
				if (!need(a.reason, '请填写取消原因')) return
				call = () => cancelShopOrder(id, a.reason.trim())
			} else if (a.type === 'issue') {
				if (!need(a.invoiceNo, '请填写发票号码')) return
				call = () => issueShopInvoice(id, a.invoiceNo.trim(), a.file)
			} else if (a.type === 'invoicefile') {
				if (!a.file || !a.file.fileID) { this.$message.warning('请先选择发票文件'); return }
				call = () => setShopInvoiceFile(id, a.file)
			} else if (a.type === 'reject') {
				if (!need(a.reason, '请填写驳回原因')) return
				call = () => rejectShopInvoice(id, a.reason.trim())
			} else if (a.type === 'refunded') call = () => markShopOrderRefunded(id, a.note.trim())
			else return
			try {
				this.acting = true
				this.detail = await call()
				if (a.type === 'ship' && CARRIERS.includes(a.carrier)) rememberCarrier(a.carrier)
				this.actionVisible = false
				this.$message.success('操作成功')
				this.fetch()
			} catch (error) {
				// 状态已经被别人改了等：提示后重新取一次最新的订单
				notifyError(this, error, '操作失败')
				try { this.detail = await getShopOrder(id) } catch (e) { /* 保留当前显示 */ }
				this.fetch()
			} finally {
				this.acting = false
			}
		}
	}
}
</script>

<style scoped>
.row-actions { gap: 4px 14px; }
.act-danger { color: #cf1322; }
.ship-sum { background: #fafafa; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; line-height: 22px; color: #595959; }
.od-head { display: flex; align-items: center; margin-bottom: 16px; }
.od-total { font-size: 22px; font-weight: 600; margin-left: 16px; color: #fa8c16; }
.od-sub { margin-left: 12px; color: #8c8c8c; }
.od-block { margin-bottom: 16px; }
.od-title { font-weight: 600; margin-bottom: 6px; }
.od-pre { white-space: pre-wrap; }
.od-table { width: 100%; border-collapse: collapse; }
.od-table th, .od-table td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; text-align: left; }
.od-table th { color: #8c8c8c; font-weight: 500; }
.od-log { padding: 3px 0; font-size: 13px; }
.od-log-time { color: #8c8c8c; margin-right: 8px; }
.od-log-note { color: #8c8c8c; margin-left: 8px; }
.od-actions .ant-btn { margin-right: 8px; }
</style>
