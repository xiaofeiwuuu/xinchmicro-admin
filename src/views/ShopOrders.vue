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
			<a-table class="orders-table" :scroll="tableScroll" rowKey="id" :columns="columns" :dataSource="orders" :pagination="pagination" :loading="loading" :rowClassName="rowClass" @change="handleTableChange">
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
					<a-tag v-if="record.refundState" :color="REFUND_STATE[record.refundState].color">{{ REFUND_STATE[record.refundState].text }}</a-tag>
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

		<!-- 订单详情：摘要条 → 订单信息 → 商品 → 发票 → 操作记录（时间轴，最新在上）；操作按钮固定在弹窗底部 -->
		<a-modal v-model="detailVisible" title="订单详情" :width="980" :destroyOnClose="true" :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px' }">
			<a-spin :spinning="detailLoading">
				<div v-if="detail" class="od">
					<!-- 摘要：状态、金额、订单号、下单和付款时间 -->
					<div class="od-sum">
						<div class="od-sum-main">
							<div class="od-tags">
								<a-tag :color="ORDER_STATUS[detail.status].color" class="od-status">{{ ORDER_STATUS[detail.status].text }}</a-tag>
								<a-tag v-if="detail.refundState" :color="REFUND_STATE[detail.refundState].color">{{ REFUND_STATE[detail.refundState].text }}</a-tag>
							</div>
							<div class="od-total">{{ money(detail.totalAmount) }}</div>
						</div>
						<div class="od-sum-meta">
							<div><span class="k">订单号</span>{{ detail.orderNo }}<a class="od-copy" @click="copyText(detail.orderNo)">复制</a></div>
							<div><span class="k">下单时间</span>{{ detail.createdAt }}</div>
							<div><span class="k">付款</span>{{ detail.paidBy ? PAID_BY[detail.paidBy] + (detail.paidAt ? '　' + detail.paidAt : '') : '未付款' }}</div>
						</div>
					</div>

					<a-alert v-if="detail.refundPending" type="error" show-icon class="od-alert"
						message="这个订单有一笔微信付款需要退还给客户。系统会自动向微信申请退款（见下方操作记录）；如果多次失败，请到微信商户平台手动退款，再点「标记已退款」。" />

					<!-- 订单进度：下单 → 付款 → 发货 → 收货 → 开票，所有步骤都显示。
						没到的灰色、做完的绿色、正在进行的蓝色；取消、退款失败是红色。取消的订单只显示走过的步骤和取消、退款 -->
					<div class="od-card">
						<div class="od-title">订单进度</div>
						<div class="st">
							<div v-for="(p, i) in steps" :key="i" class="st-step" :class="'is-' + p.state">
								<div class="st-top"><span class="st-dot"></span></div>
								<div class="st-name">{{ p.name }}</div>
								<div class="st-state">{{ p.stateText || STEP_STATE[p.state] }}</div>
								<div v-if="p.note" class="st-note">{{ p.note }}</div>
								<div v-if="p.time" class="st-time">{{ p.time }}</div>
							</div>
						</div>
						<div class="od-logs-toggle"><a @click="showLogs = !showLogs">{{ showLogs ? '收起' : '查看' }}全部操作记录（{{ (detail.logs || []).length }} 条）</a></div>
						<div v-if="showLogs" class="od-logs">
							<div v-for="l in detail.logs || []" :key="l.id" class="od-log">
								<span class="od-log-time">{{ l.createdAt }}</span>
								<span class="od-log-actor">{{ ACTOR[l.actorType] }}</span>
								<span>{{ LOG_ACTION[l.action] || l.action }}</span>
								<span v-if="l.note" class="od-log-note">{{ l.note }}</span>
							</div>
						</div>
					</div>

					<!-- 订单信息：客户、收货、物流放在一张卡里，不再分左右两栏 -->
					<div class="od-card">
						<div class="od-title">订单信息</div>
						<div class="od-kv"><span class="k">客户</span><span class="v">{{ (detail.customer && detail.customer.nickname) || '（未设置）' }}　{{ detail.customer && detail.customer.phone }}</span></div>
						<div class="od-kv"><span class="k">收货人</span><span class="v">{{ detail.address.consignee }}　{{ detail.address.phone }}</span></div>
						<div class="od-kv"><span class="k">收货地址</span><span class="v od-pre">{{ detail.address.region }} {{ detail.address.detail }}</span></div>
						<div v-if="detail.remark" class="od-kv"><span class="k">客户备注</span><span class="v od-pre">{{ detail.remark }}</span></div>
						<div v-if="detail.expressNo" class="od-kv"><span class="k">物流</span><span class="v">{{ detail.expressCompany }}　{{ detail.expressNo }}<a class="od-copy" @click="copyText(detail.expressNo)">复制</a></span></div>
						<div v-if="detail.cancelReason" class="od-kv"><span class="k">取消原因</span><span class="v">{{ detail.cancelReason }}</span></div>
					</div>

					<div class="od-card">
						<div class="od-title">商品（{{ detail.items.length }} 种）</div>
						<table class="od-table">
							<tr><th>名称</th><th class="r" style="width: 100px;">单价</th><th class="r" style="width: 70px;">数量</th><th class="r" style="width: 110px;">小计</th></tr>
							<tr v-for="i in detail.items" :key="i.productId">
								<td>{{ i.name }}</td><td class="r">{{ money(i.price) }}</td><td class="r">{{ i.qty }}</td><td class="r">{{ money(i.subtotal) }}</td>
							</tr>
							<tr class="sum"><td colspan="3" class="r">合计</td><td class="r">{{ money(detail.totalAmount) }}</td></tr>
						</table>
					</div>

					<div v-if="detail.invoiceStatus !== 'none'" class="od-card">
						<div class="od-title">发票 <a-tag :color="INVOICE_STATUS[detail.invoiceStatus].color" class="od-mini">{{ INVOICE_STATUS[detail.invoiceStatus].text }}</a-tag></div>
						<template v-if="detail.invoice">
							<div class="od-kv"><span class="k">类型</span><span class="v">{{ INVOICE_TYPE[detail.invoice.type] }}</span></div>
							<div class="od-kv"><span class="k">抬头</span><span class="v">{{ detail.invoice.title }}</span></div>
							<div class="od-kv"><span class="k">税号</span><span class="v">{{ detail.invoice.taxId }}</span></div>
							<div v-if="detail.invoice.address" class="od-kv"><span class="k">地址电话</span><span class="v">{{ detail.invoice.address }} {{ detail.invoice.phone }}</span></div>
							<div v-if="detail.invoice.bank" class="od-kv"><span class="k">开户行账号</span><span class="v">{{ detail.invoice.bank }} {{ detail.invoice.account }}</span></div>
							<div v-if="detail.invoice.email" class="od-kv"><span class="k">邮箱</span><span class="v">{{ detail.invoice.email }}</span></div>
						</template>
						<div v-if="detail.invoiceNo" class="od-kv"><span class="k">发票号码</span><span class="v">{{ detail.invoiceNo }}</span></div>
						<div v-if="detail.invoiceStatus === 'issued'" class="od-kv">
							<span class="k">发票文件</span>
							<span class="v">
								<template v-if="detail.invoiceFileID">
									<a @click="openInvoiceFile(detail.invoiceFileID)">{{ detail.invoiceFile && detail.invoiceFile.name }}</a>
									<span class="od-sub">客户可在小程序里下载</span>
								</template>
								<span v-else class="od-sub" style="margin-left: 0;">还没有上传，客户在小程序里下载不到发票</span>
							</span>
						</div>
					</div>

				</div>
			</a-spin>
			<!-- 操作按钮固定在弹窗底部，不用滚到最下面才看到 -->
			<template slot="footer">
				<a-button @click="detailVisible = false">关闭</a-button>
				<template v-if="detail">
					<a-button v-if="detail.invoiceStatus === 'requesting'" @click="openAction('reject')">驳回开票申请</a-button>
					<a-button v-if="detail.invoiceStatus === 'requesting'" type="primary" ghost @click="openAction('issue')">开具发票</a-button>
					<a-button v-if="detail.invoiceStatus === 'issued'" type="primary" ghost @click="openAction('invoicefile')">{{ detail.invoiceFileID ? '替换发票文件' : '上传发票文件' }}</a-button>
					<a-button v-if="detail.refundPending" @click="openAction('refunded')">标记已退款</a-button>
					<a-button v-if="canCancel" type="danger" ghost @click="openAction('cancel')">取消订单</a-button>
					<a-button v-if="detail.status === 'pending_ship'" type="primary" @click="openAction('ship')">发货</a-button>
				</template>
			</template>
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
import { ORDER_STATUS, REFUND_STATE, INVOICE_STATUS, INVOICE_TYPE, PAID_BY, LOG_ACTION, ACTOR, money } from '@/utils/shop'

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
			showLogs: false,
			STEP_STATE: { done: '已完成', current: '进行中', todo: '未开始', bad: '' },
			ORDER_STATUS, REFUND_STATE, INVOICE_STATUS, INVOICE_TYPE, PAID_BY, LOG_ACTION, ACTOR, ACTIONS, CARRIERS, OTHER_CARRIER,
			filters: { keyword: '', status: undefined, invoice: undefined, refundPending: false },
			// 从右上角通知点进来：要让这一单的整行闪几下（订单号）；flashNo 是正在闪的那一行
			wantFlash: this.$route.query.highlight || '',
			flashNo: '',
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
		// 订单进度。state：done 做完 / current 正在进行 / todo 没到 / bad 取消或失败
		steps() {
			const d = this.detail
			if (!d) return []
			const logs = d.logs || []
			const at = (...acts) => { const l = [...logs].reverse().find((x) => acts.includes(x.action)); return l ? l.createdAt : '' }
			const S = (name, state, time, note) => ({ name, state, time: time || '', note: note || '' })
			const paid = !!d.paidBy
			// 取消的订单：流程到这里就结束了，只显示走过的步骤，加上取消和退款
			if (d.status === 'cancelled') {
				const out = [S('提交订单', 'done', d.createdAt)]
				if (paid) out.push(S('支付成功', 'done', d.paidAt || at('wechat_paid')))
				const out2 = S('订单已取消', 'bad', at('cancel', 'expire'), d.cancelReason)
				out2.stateText = '已取消'
				out.push(out2)
				if (paid) {
					// 退款情况由服务端算好（refundState）：失败 / 处理中 / 等待发起 / 已退款
					const rs = d.refundState
					if (rs === 'failed') out.push(S('退款失败', 'bad', at('refund_failed'), '需要人工在微信商户平台退款'))
					else if (rs === 'processing' || rs === 'pending') out.push(S('退款中', 'current', at('refund_requested'), rs === 'processing' ? '已向微信申请退款' : '等待系统发起退款'))
					else out.push(S('已退款', 'done', at('wechat_refunded', 'refund_done')))
				}
				return out
			}
			const shipped = ['shipped', 'completed'].includes(d.status)
			const inv = d.invoiceStatus
			return [
				S('提交订单', 'done', d.createdAt),
				paid ? S('支付成功', 'done', d.paidAt || at('wechat_paid')) : S('等待付款', 'current', '', '超时会自动取消'),
				shipped ? S('商家发货', 'done', at('ship'), d.expressNo ? `${d.expressCompany} ${d.expressNo}` : '') : S('商家发货', paid ? 'current' : 'todo'),
				d.status === 'completed' ? S('确认收货', 'done', at('receive')) : S('确认收货', d.status === 'shipped' ? 'current' : 'todo'),
				inv === 'issued' ? S('开具发票', 'done', at('invoice_issue'), d.invoiceNo ? `发票号码 ${d.invoiceNo}` : '')
					: inv === 'requesting' ? S('开具发票', 'current', at('invoice_apply'), '客户已申请，等待开具')
						: S('开具发票', 'todo', '', '客户未申请')
			]
		},
		canCancel() {
			return this.detail && ['pending_payment', 'pending_ship'].includes(this.detail.status)
		}
	},
	beforeDestroy() {
		clearTimeout(this.flashTimer)
	},
	watch: {
		// 地址上的查询条件变了：点了右上角通知（highlight），或「客户管理 → 查看订单」/清除客户筛选（customerId）
		'$route.query'(q, old) {
			if (q.highlight) {
				// 通知：回到完整的订单列表（清掉筛选），找到这一单让它闪
				this.wantFlash = q.highlight
				this.filters = { keyword: '', status: undefined, invoice: undefined, refundPending: false }
				this.customerId = ''
				this.customerName = ''
				return this.handleSearch()
			}
			if (old.highlight && !q.highlight) return // 闪完后我们自己把地址里的 highlight 清掉了，不用重新查
			if (q.customerId === old.customerId) return
			this.customerId = q.customerId || ''
			this.customerName = q.name || ''
			this.handleSearch()
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
				this.flashIfWanted()
			} catch (error) {
				notifyError(this, error, '获取订单列表失败')
			} finally {
				this.loading = false
			}
		},
		rowClass(record) {
			return record.orderNo === this.flashNo ? 'row-flash' : ''
		},
		// 列表加载完，如果是从通知点进来的：滚到这一行并让它闪几下。
		// 这一单不在当前这一页（比如是几页之前下的单）时，退一步：把订单号填进搜索框，只查它，再闪
		flashIfWanted() {
			const no = this.wantFlash
			if (!no) return
			if (this.orders.some((o) => o.orderNo === no)) {
				this.wantFlash = ''
				this.flashNo = no
				// 地址里的 highlight 用完就清掉，刷新页面不会再闪
				if (this.$route.query.highlight) this.$router.replace({ path: '/shop/orders' }).catch(() => {})
				this.$nextTick(() => {
					const el = document.querySelector('.orders-table tr.row-flash')
					if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
				})
				clearTimeout(this.flashTimer)
				this.flashTimer = setTimeout(() => { this.flashNo = '' }, 3600)
			} else if (this.filters.keyword !== no) {
				this.filters.keyword = no
				this.pagination.current = 1
				this.fetch()
			} else {
				this.wantFlash = '' // 搜订单号也没有（已经不存在）：不闪了
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
			this.showLogs = false
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
		// 复制订单号、运单号：优先用剪贴板接口，不可用（非 https 等）时退回到临时文本框
		copyText(text) {
			const done = () => this.$message.success('已复制')
			const fallback = () => {
				const el = document.createElement('textarea')
				el.value = text
				el.style.position = 'fixed'
				el.style.opacity = '0'
				document.body.appendChild(el)
				el.select()
				try { document.execCommand('copy') && done() } catch (e) { this.$message.warning('复制失败，请手动选择复制') }
				document.body.removeChild(el)
			}
			if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback)
			else fallback()
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
/* 从通知点进来：这一行的背景色闪几下（蓝 → 透明，循环 3 次，共约 3.6 秒） */
.orders-table >>> tr.row-flash > td { animation: rowFlash 1.2s ease-in-out 3; }
@keyframes rowFlash {
	0%, 100% { background-color: transparent; }
	50% { background-color: #bae0ff; }
}
.row-actions { gap: 4px 14px; }
.act-danger { color: #cf1322; }
.ship-sum { background: #fafafa; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; line-height: 22px; color: #595959; }
.od-sum { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 16px 20px; margin-bottom: 16px; background: #f5f9ff; border-radius: 8px; }
.od-tags { display: flex; align-items: center; margin-bottom: 4px; }
.od-status { font-size: 14px; padding: 2px 12px; }
.od-total { font-size: 28px; font-weight: 600; line-height: 38px; color: #262626; }
.od-sum-meta { line-height: 24px; color: #262626; font-size: 13px; }
.od-sum-meta .k { display: inline-block; width: 64px; color: #8c8c8c; }
.od-copy { margin-left: 10px; font-size: 12px; }
.od-alert { margin-bottom: 16px; }
.od-card { padding: 14px 16px 6px; margin-bottom: 14px; border: 1px solid #f0f0f0; border-radius: 8px; }
.od-title { font-weight: 600; margin-bottom: 8px; }
.od-kv { display: flex; padding: 4px 0; line-height: 22px; }
.od-kv .k { flex: 0 0 84px; color: #8c8c8c; }
.od-kv .v { flex: 1; min-width: 0; word-break: break-all; }
.od-sub { margin-left: 12px; color: #8c8c8c; font-size: 12px; }
.od-mini { margin-left: 6px; }
.od-pre { white-space: pre-wrap; }
.od-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.od-table th, .od-table td { padding: 8px 4px; border-bottom: 1px solid #f5f5f5; text-align: left; }
.od-table th { color: #8c8c8c; font-weight: 500; font-size: 12px; }
.od-table .r { text-align: right; }
.od-table tr.sum td { border-bottom: 0; font-weight: 600; }
/* 订单进度步骤条：灰色（没到）、绿色（做完）、蓝色（进行中）、红色（取消/失败）。线的颜色看左边这一步是不是做完了 */
.st { display: flex; padding: 6px 0 4px; }
.st-step { position: relative; flex: 1 1 0; min-width: 0; padding: 0 8px 0 0; }
.st-top { position: relative; height: 22px; }
.st-step::before { content: ''; position: absolute; left: 26px; right: 4px; top: 10px; height: 2px; background: #e5e5e5; }
.st-step.is-done::before { background: #52c41a; }
.st-step:last-child::before { display: none; }
.st-dot { position: relative; display: block; width: 22px; height: 22px; box-sizing: border-box; border-radius: 50%; border: 2px solid #d9d9d9; background: #fff; }
.is-done .st-dot { border-color: #52c41a; background: #52c41a; }
.is-done .st-dot::after { content: ''; position: absolute; left: 6px; top: 2px; width: 5px; height: 10px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.is-current .st-dot { border-color: #1890ff; background: #1890ff; box-shadow: 0 0 0 4px #e6f4ff; }
.is-current .st-dot::after { content: ''; position: absolute; left: 5px; top: 5px; width: 8px; height: 8px; border-radius: 50%; background: #fff; }
.is-bad .st-dot { border-color: #cf1322; background: #cf1322; box-shadow: 0 0 0 4px #fff1f0; }
.is-bad .st-dot::after { content: '!'; position: absolute; left: 0; right: 0; top: 0; text-align: center; color: #fff; font-weight: 700; font-size: 13px; line-height: 18px; }
.st-name { margin-top: 8px; font-weight: 600; line-height: 22px; }
.is-todo .st-name { color: #bfbfbf; font-weight: 500; }
.st-state { font-size: 12px; line-height: 20px; color: #8c8c8c; }
.is-done .st-state { color: #52c41a; }
.is-current .st-state { color: #1890ff; }
.is-bad .st-state, .is-bad .st-name { color: #cf1322; }
.st-note { margin-top: 2px; color: #595959; font-size: 12px; line-height: 18px; word-break: break-all; }
.st-time { color: #8c8c8c; font-size: 12px; line-height: 18px; }
.is-todo .st-note, .is-todo .st-time { color: #bfbfbf; }
.od-logs-toggle { margin: 6px 0 8px; font-size: 12px; }
.od-logs { margin-bottom: 8px; padding: 8px 12px; background: #fafafa; border-radius: 6px; }
.od-log { padding: 3px 0; font-size: 12px; line-height: 20px; }
.od-log-time { color: #8c8c8c; margin-right: 8px; }
.od-log-actor { display: inline-block; margin-right: 8px; padding: 0 6px; color: #8c8c8c; border: 1px solid #e8e8e8; border-radius: 4px; line-height: 16px; }
.od-log-note { color: #8c8c8c; margin-left: 8px; }
</style>
