<template>
	<div>
		<a-card :bordered="false" class="mb-24">
			<a-input v-model="filters.orderNo" placeholder="订单号" style="width: 160px; margin-right: 12px;" allowClear @pressEnter="handleSearch" />
			<!-- 客户：搜昵称/手机号。从数据统计、客户管理跳过来时按客户筛选，客户名直接显示在框里；点清除或改字就取消按客户筛选 -->
			<a-input :value="customerId ? customerLabel : filters.customer" placeholder="客户昵称 / 手机号" style="width: 160px; margin-right: 12px;" allowClear @change="onCustomerInput" @pressEnter="handleSearch" />
			<a-input v-model="filters.receiver" placeholder="收货人 / 电话" style="width: 160px; margin-right: 12px;" allowClear @pressEnter="handleSearch" />
			<!-- 下单日期段（北京时间，含首尾）：公共组件，日期选择在前，快捷按钮在后 -->
			<date-range-quick v-model="dates" :pickerWidth="250" :placeholder="['下单开始日期', '下单结束日期']" @change="handleSearch" />
			<a-select v-model="filters.status" placeholder="订单状态" style="width: 160px; margin-right: 12px;" allowClear @change="handleSearch">
				<a-select-option v-for="(v, k) in ORDER_STATUS" :key="k" :value="k">{{ v.text }}</a-select-option>
			</a-select>
			<a-select v-model="filters.invoice" placeholder="开票状态" style="width: 160px; margin-right: 12px;" allowClear @change="handleSearch">
				<a-select-option v-for="(v, k) in INVOICE_STATUS" :key="k" :value="k">{{ v.text }}</a-select-option>
			</a-select>
			<a-select v-model="filters.todo" placeholder="待处理事项" style="width: 160px; margin-right: 12px;" allowClear @change="handleSearch">
				<a-select-option value="refund">需要退款</a-select-option>
				<a-select-option value="afterSales">售后待处理</a-select-option>
				<a-select-option value="cancelRequest">客户申请取消</a-select-option>
			</a-select>
			<a-button type="primary" @click="handleSearch"><a-icon type="search" /> 搜索</a-button>
			<a-button style="margin-left: 8px;" @click="handleReset">重置</a-button>
			<span class="tool-btns">
				<a-button :loading="exporting" @click="exportOrders">导出订单</a-button>
				<a-button v-can="'order.ship'" @click="openBulk">批量发货</a-button>
				<a-button :disabled="!selectedKeys.length" @click="printSelected">打印发货单{{ selectedKeys.length ? '（' + selectedKeys.length + '）' : '' }}</a-button>
			</span>
		</a-card>

		<a-card :bordered="false">
			<a-table class="orders-table" :scroll="tableScroll" rowKey="id" :columns="columns" :dataSource="orders" :pagination="pagination" :loading="loading" :rowClassName="rowClass" :rowSelection="{ selectedRowKeys: selectedKeys, onChange: onSelect }" @change="handleTableChange">
				<!-- 订单号、客户、收货人的文字点一下就复制（页面默认不能选中文字） -->
				<template slot="orderNo" slot-scope="text">
					<span class="copy-cell" title="点击复制" @click="copyText(text)">{{ text }}</span>
				</template>
				<template slot="customer" slot-scope="text, record">
					<span v-if="record.customer && record.customer.deleted" class="cust-deleted" title="客户自己注销了账号，个人信息已清除；订单和下单时的收货信息按法律要求保留">已注销用户</span>
					<span v-else-if="record.customer && record.customer.nickname" class="copy-cell" title="点击复制" @click="copyText(record.customer.nickname)">{{ record.customer.nickname }}</span>
					<span v-else>（未设置）</span>
					<div v-if="record.customer && record.customer.phone" style="color: #8c8c8c; font-size: 12px;"><span class="copy-cell" title="点击复制" @click="copyText(record.customer.phone)">{{ record.customer.phone }}</span></div>
				</template>
				<template slot="receiver" slot-scope="text, record">
					<span class="copy-cell" title="点击复制" @click="copyText(record.address.consignee)">{{ record.address.consignee }}</span>
					<div style="color: #8c8c8c; font-size: 12px;"><span class="copy-cell" title="点击复制" @click="copyText(record.address.phone)">{{ record.address.phone }}</span></div>
				</template>
				<template slot="amount" slot-scope="text">{{ money(text) }}</template>
				<template slot="status" slot-scope="text, record">
					<a-tag :color="ORDER_STATUS[text].color">{{ ORDER_STATUS[text].text }}</a-tag>
					<a-tag v-if="record.refundState" :color="REFUND_STATE[record.refundState].color">{{ REFUND_STATE[record.refundState].text }}</a-tag>
					<a-tag v-if="record.refundedAmount" :color="record.fullyRefunded ? 'green' : 'orange'">{{ record.fullyRefunded ? '已全额退款' : '已退款 ' + money(record.refundedAmount) }}</a-tag>
					<a-tag v-if="record.cancelRequest && record.cancelRequest.status === 'pending'" color="orange">申请取消</a-tag>
					<a-tag v-if="activeSale(record)" :color="AFTER_SALE_STATUS[activeSale(record).status].color">售后：{{ AFTER_SALE_STATUS[activeSale(record).status].short }}</a-tag>
				</template>
				<!-- 备注列：客户下单时写的备注（发货要看）、取消原因、最近一次售后的原因和商家处理说明；每条最多两行，完整内容鼠标放上去看，点一下复制 -->
				<template slot="remark" slot-scope="text, record">
					<template v-if="remarkLines(record).length">
						<div v-for="l in remarkLines(record)" :key="l.k" class="rm" :class="l.cls" :title="l.full + '（点击复制）'" @click="copyText(l.full)">{{ l.label }}{{ l.text }}</div>
					</template>
					<span v-else style="color: #bfbfbf;">-</span>
				</template>
				<template slot="invoice" slot-scope="text">
					<a-tag :color="INVOICE_STATUS[text].color">{{ INVOICE_STATUS[text].text }}</a-tag>
				</template>
				<template slot="action" slot-scope="text, record">
					<div class="row-actions">
						<a @click="openDetail(record.id)">详情</a>
						<!-- 其它操作都收进「更多」（按订单状态只列能做的）；有要处理的事（申请取消、售后、退款、开票）时「更多」上有个橙色小点 -->
						<a-dropdown :trigger="['click']" placement="bottomRight">
							<a class="more-link" @click.prevent>更多<a-icon type="down" /><i v-if="needsAction(record)" class="more-dot"></i></a>
							<a-menu slot="overlay" @click="(e) => onMore(record, e.key)">
								<template v-for="m in moreItems(record)">
									<a-menu-divider v-if="m.divider" :key="m.key" />
									<a-menu-item v-else :key="m.key"><span :class="{ 'act-danger': m.danger }">{{ m.label }}</span></a-menu-item>
								</template>
							</a-menu>
						</a-dropdown>
					</div>
				</template>
			</a-table>
		</a-card>

		<!-- 订单详情：摘要条 → 订单信息 → 商品 → 发票 → 操作记录（时间轴，最新在上） ；只看不改，操作都在列表的操作列 -->
		<a-modal v-model="detailVisible" title="订单详情" :width="980" :destroyOnClose="true" :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px' }">
			<a-spin :spinning="detailLoading">
				<div v-if="detail" class="od">
					<!-- 摘要：左边订单号、下单和付款时间，右边状态和金额 -->
					<div class="od-sum">
						<div class="od-sum-meta">
							<div><span class="k">订单号</span>{{ detail.orderNo }}<a class="od-copy" @click="copyText(detail.orderNo)">复制</a></div>
							<div><span class="k">下单时间</span>{{ detail.createdAt }}</div>
							<div><span class="k">付款</span>{{ detail.paidBy ? PAID_BY[detail.paidBy] + (detail.paidAt ? '　' + detail.paidAt : '') : '未付款' }}</div>
						</div>
						<div class="od-sum-main">
							<div class="od-tags">
								<a-tag :color="ORDER_STATUS[detail.status].color" class="od-status">{{ ORDER_STATUS[detail.status].text }}</a-tag>
								<a-tag v-if="detail.refundedAmount" :color="detail.fullyRefunded ? 'green' : 'orange'" class="od-status">{{ detail.fullyRefunded ? '已全额退款' : '已退款 ' + money(detail.refundedAmount) }}</a-tag>
								<a-tag v-if="detail.refundState" :color="REFUND_STATE[detail.refundState].color">{{ REFUND_STATE[detail.refundState].text }}</a-tag>
							</div>
							<div class="od-total">{{ money(detail.totalAmount) }}</div>
						</div>
					</div>

					<a-alert v-if="detail.refundPending" type="error" show-icon class="od-alert"
						message="这个订单有一笔微信付款需要退还给客户。系统会自动向微信申请退款（见下方操作记录）；如果多次失败，请到微信商户平台手动退款，再在订单列表这一行点「标记已退款」。" />

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
						<div class="od-kv"><span class="k">客户</span><span class="v"><span v-if="detail.customer && detail.customer.deleted" class="cust-deleted" title="客户自己注销了账号，个人信息已清除；订单和下单时的收货信息按法律要求保留">已注销用户</span><span v-else-if="detail.customer && detail.customer.nickname" class="copy-cell" title="点击复制" @click="copyText(detail.customer.nickname)">{{ detail.customer.nickname }}</span><span v-else>（未设置）</span>　<span v-if="detail.customer && detail.customer.phone" class="copy-cell" title="点击复制" @click="copyText(detail.customer.phone)">{{ detail.customer.phone }}</span></span></div>
						<div class="od-kv"><span class="k">收货人</span><span class="v"><span class="copy-cell" title="点击复制" @click="copyText(detail.address.consignee)">{{ detail.address.consignee }}</span>　<span class="copy-cell" title="点击复制" @click="copyText(detail.address.phone)">{{ detail.address.phone }}</span></span></div>
						<div class="od-kv"><span class="k">收货地址</span><span class="v od-pre"><span class="copy-cell" title="点击复制" @click="copyText(detail.address.region + ' ' + detail.address.detail)">{{ detail.address.region }} {{ detail.address.detail }}</span></span></div>
						<div v-if="detail.remark" class="od-kv"><span class="k">客户备注</span><span class="v od-pre">{{ detail.remark }}</span></div>
						<div class="od-kv"><span class="k">商家备注</span><span class="v od-pre"><span v-if="detail.adminRemark" class="rm-admin-text">{{ detail.adminRemark }}</span><span v-else style="color: #bfbfbf;">暂无（只有后台能看到）</span><a v-can="'order.remark'" class="od-copy" @click="openAction('remark')">{{ detail.adminRemark ? '修改' : '添加' }}</a></span></div>
						<div v-if="detail.cancelRequest" class="od-kv"><span class="k">取消申请</span><span class="v od-pre">
							<a-tag :color="{ pending: 'orange', rejected: '', approved: 'green' }[detail.cancelRequest.status]">{{ { pending: '待处理', rejected: '已拒绝', approved: '已同意，订单已取消' }[detail.cancelRequest.status] }}</a-tag>
							客户原因：{{ detail.cancelRequest.reason }}<template v-if="detail.cancelRequest.rejectReason">　拒绝原因：{{ detail.cancelRequest.rejectReason }}</template>
							<template v-if="detail.cancelRequest.status === 'pending' && detail.status === 'pending_ship'">
								<template v-if="can('order.cancel')"><a class="od-copy" @click="approveCancel(detail)">同意取消</a><a class="od-copy act-danger" @click="openAction('cancel_no')">拒绝</a></template>
							</template>
						</span></div>
						<div v-if="detail.expressNo" class="od-kv"><span class="k">物流</span><span class="v">{{ detail.expressCompany }}　{{ detail.expressNo }}<a class="od-copy" @click="copyText(detail.expressNo)">复制</a></span></div>
						<div v-if="detail.waybillToken" class="od-kv"><span class="k">物流状态</span><span class="v">
							<template v-if="logi && logi.status !== null"><a-tag :color="logiColor(logi.status)">{{ logi.statusText }}</a-tag><a class="od-copy" @click="loadLogi(detail.id)">刷新</a></template>
							<template v-else-if="logiLoading"><a-icon type="loading" /> 查询中…</template>
							<template v-else><span class="od-muted">暂时查不到</span><a class="od-copy" @click="loadLogi(detail.id)">重试</a></template>
						</span></div>
						<div v-if="logi && logi.traces && logi.traces.length" class="od-kv"><span class="k">物流进度</span><span class="v">
							<div v-for="(t, i) in (logiAll ? logi.traces : logi.traces.slice(0, 3))" :key="i" class="od-trace" :class="{ 'is-first': i === 0 }">{{ t.text }}</div>
							<a v-if="logi.traces.length > 3" @click="logiAll = !logiAll">{{ logiAll ? '收起' : '查看全部 ' + logi.traces.length + ' 条' }}</a>
						</span></div>
						<div v-if="detail.expressNo" class="od-kv"><span class="k">发货凭证</span><span class="v">
							<a v-if="detail.shipPhotoFileID" @click="openInvoiceFile(detail.shipPhotoFileID)">查看照片</a>
							<span v-else style="color: #8c8c8c;">未上传（选填，仅后台可见）</span>
						</span></div>
						<div v-if="detail.cancelReason" class="od-kv"><span class="k">取消原因</span><span class="v">{{ detail.cancelReason }}</span></div>
					</div>

					<div class="od-card">
						<div class="od-title">商品（{{ detail.items.length }} 种）</div>
						<table class="od-table">
							<tr><th>名称</th><th class="r" style="width: 100px;">单价</th><th class="r" style="width: 70px;">数量</th><th class="r" style="width: 110px;">小计</th></tr>
							<tr v-for="i in detail.items" :key="i.productId">
								<td><span class="copy-cell" title="点击复制" @click="copyText(i.name)">{{ i.name }}</span></td><td class="r">{{ money(i.price) }}</td><td class="r">{{ i.qty }}</td><td class="r">{{ money(i.subtotal) }}</td>
							</tr>
							<tr class="sum"><td colspan="3" class="r">合计</td><td class="r">{{ money(detail.totalAmount) }}</td></tr>
						</table>
					</div>

					<!-- 售后：发货后的退款、退货退款、换货。每条申请一块，按状态给出能做的操作 -->
					<div v-if="detail.afterSales && detail.afterSales.length" class="od-card">
						<div class="od-title">售后（{{ detail.afterSales.length }}）</div>
						<div v-for="s in detail.afterSales" :key="s.id" class="as-block">
							<div class="as-head">
								<a-tag color="purple">{{ AFTER_SALE_TYPE[s.type] }}</a-tag>
								<a-tag :color="AFTER_SALE_STATUS[s.status].color">{{ AFTER_SALE_STATUS[s.status].text }}</a-tag>
								<span class="od-sub" style="margin-left: 0;">{{ s.createdAt }}</span>
							</div>
							<div class="od-kv"><span class="k">原因</span><span class="v">{{ s.reason }}</span></div>
							<div v-if="s.description" class="od-kv"><span class="k">客户说明</span><span class="v od-pre">{{ s.description }}</span></div>
							<div v-if="s.returnNo" class="od-kv"><span class="k">客户寄回</span><span class="v">{{ s.returnCompany }}　{{ s.returnNo }}<a class="od-copy" @click="copyText(s.returnNo)">复制</a></span></div>
							<div v-if="s.refundAmount" class="od-kv"><span class="k">退款金额</span><span class="v">{{ money(s.refundAmount) }}<span v-if="s.refundState" class="od-sub">{{ AFTER_SALE_REFUND_STATE[s.refundState] }}</span></span></div>
							<div v-if="s.replaceNo" class="od-kv"><span class="k">寄出新货</span><span class="v">{{ s.replaceCompany }}　{{ s.replaceNo }}</span></div>
							<div v-if="s.returnTo" class="od-kv"><span class="k">退回地址</span><span class="v">{{ s.returnTo.name }}　{{ s.returnTo.phone }}　<span class="od-pre">{{ s.returnTo.address }}</span></span></div>
							<div v-if="s.adminNote" class="od-kv"><span class="k">{{ s.status === 'rejected' ? '拒绝原因' : '处理说明' }}</span><span class="v od-pre">{{ s.adminNote }}</span></div>
							<div class="as-actions">
								<span v-if="['requested', 'returning', 'refund_failed'].includes(s.status)" class="od-sub" style="margin-left: 0;">需要处理：请在订单列表这一行的操作列里操作</span>
								<span v-else-if="s.status === 'refunding'" class="od-sub" style="margin-left: 0;">微信正在退款，到账后会自动变成「已退款」</span>
								<span v-else-if="s.status === 'approved'" class="od-sub" style="margin-left: 0;">等客户按你写的地址寄回，寄出后这里会出现快递单号</span>
							</div>
						</div>
						<a-alert v-if="detail.invoiceStatus === 'issued' && detail.afterSales.some((x) => ['refunding', 'refunded'].includes(x.status))" type="warning" show-icon class="od-alert"
							message="这个订单已经开具发票，退款后需要财务做红字发票冲销（系统不处理）。" />
					</div>

					<div v-if="detail.invoiceStatus !== 'none'" class="od-card">
						<div class="od-title">发票 <a-tag :color="INVOICE_STATUS[detail.invoiceStatus].color" class="od-mini">{{ INVOICE_STATUS[detail.invoiceStatus].text }}</a-tag></div>
						<template v-if="detail.invoice">
							<div class="od-kv"><span class="k">类型</span><span class="v">{{ INVOICE_TYPE[detail.invoice.type] }}</span></div>
							<div class="od-kv"><span class="k">应开金额</span><span class="v"><b>{{ money(detail.invoiceAmount) }}</b><span v-if="detail.refundedAmount" class="od-sub">订单 {{ money(detail.totalAmount) }}，已退款 {{ money(detail.refundedAmount) }}，按实付减去已退的金额开票</span></span></div>
							<div class="od-kv"><span class="k">抬头</span><span class="v">{{ detail.invoice.title }}<a-tag v-if="detail.invoice.kind === 'personal'" style="margin-left: 8px;">个人</a-tag></span></div>
							<div v-if="detail.invoice.kind !== 'personal'" class="od-kv"><span class="k">税号</span><span class="v">{{ detail.invoice.taxId }}</span></div>
							<div v-if="detail.invoice.address" class="od-kv"><span class="k">地址电话</span><span class="v">{{ detail.invoice.address }} {{ detail.invoice.phone }}</span></div>
							<div v-if="detail.invoice.bank" class="od-kv"><span class="k">开户行账号</span><span class="v">{{ detail.invoice.bank }} {{ detail.invoice.account }}</span></div>
							
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
			<!-- 详情只看不改：所有操作在订单列表的操作列里 -->
			<template slot="footer">
				<a-button @click="detailVisible = false">关闭</a-button>
			</template>
		</a-modal>

		<!-- 批量发货：上传 CSV（订单号、快递公司、运单号），先预览每一行能不能发，再确认。一行一行发，哪行失败不影响别的行 -->
		<a-modal v-model="bulkVisible" title="批量发货（导入快递单号）" :width="760" :footer="null" :destroyOnClose="true">
			<div class="bulk-top">
				<a-button @click="downloadTemplate">下载模板</a-button>
				<a-button type="primary" @click="$refs.bulkFile.click()">选择 CSV 文件</a-button>
				<input ref="bulkFile" type="file" accept=".csv,text/csv" style="display: none;" @change="onBulkFile" />
				<span class="od-sub">表头要有「订单号、快递公司、运单号」，一次最多 200 行；Excel 另存为 CSV 即可</span>
			</div>
			<a-alert v-if="bulk.error" type="error" show-icon :message="bulk.error" style="margin-top: 12px;" />
			<template v-if="bulk.rows.length">
				<div class="bulk-sum">
					<template v-if="!bulk.done">预览：共 {{ bulk.rows.length }} 行，<b style="color: #389e0d;">{{ bulk.okCount }} 行可以发货</b>，<b v-if="bulk.failCount" style="color: #cf1322;">{{ bulk.failCount }} 行有问题（不会发货）</b></template>
					<template v-else>已处理：<b style="color: #389e0d;">{{ bulk.okCount }} 单已发货</b><template v-if="bulk.failCount">，<b style="color: #cf1322;">{{ bulk.failCount }} 行失败</b></template></template>
				</div>
				<div class="bulk-list">
					<table class="od-table">
						<tr><th style="width: 46px;">行</th><th>订单号</th><th>快递</th><th>运单号</th><th style="width: 220px;">结果</th></tr>
						<tr v-for="r in bulk.rows" :key="r.index">
							<td>{{ r.line }}</td><td>{{ r.orderNo }}</td><td>{{ r.expressCompany }}</td><td>{{ r.expressNo }}</td>
							<td :style="{ color: r.ok ? '#389e0d' : '#cf1322' }">{{ r.ok ? (bulk.done ? '已发货' : '可以发货') : r.message }}</td>
						</tr>
					</table>
				</div>
				<div class="bulk-foot">
					<a-button @click="bulkVisible = false">{{ bulk.done ? '完成' : '取消' }}</a-button>
					<a-button v-if="!bulk.done" type="primary" :disabled="!bulk.okCount" :loading="bulk.running" @click="runBulk">确认发货 {{ bulk.okCount }} 单</a-button>
				</div>
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
				<a-input v-model="action.expressNo" maxLength="50" placeholder="运单号" @blur="checkDuplicates" @pressEnter="submitAction" />
				<div v-for="h in expressHints" :key="h" class="ship-warn">{{ h }}</div>
				<div class="quick-label" style="margin-top: 14px;">发货凭证照片（选填，仅后台可见，不会给客户和微信）</div>
				<image-picker v-model="action.photo" kind="ship-photo" button-text="选择面单或货物照片" @uploading="(v) => (uploadingFile = v)" />
			</template>
			<template v-else-if="action.type === 'shipphoto'">
				<div v-if="detail && detail.shipPhotoFileID" class="ship-sum">
					当前已有发货凭证：<a @click="openInvoiceFile(detail.shipPhotoFileID)">查看照片</a>　<a class="act-danger" @click="clearShipPhoto">清除</a>
				</div>
				<div class="quick-label">{{ detail && detail.shipPhotoFileID ? '换一张（选了之后点「确定」才会替换）' : '面单或货物照片（仅后台可见，不会给客户和微信）' }}</div>
				<image-picker v-model="action.photo" kind="ship-photo" button-text="选择图片" @uploading="(v) => (uploadingFile = v)" />
			</template>
			<template v-else-if="action.type === 'cancel'">
				<div class="quick-label">常用原因</div>
				<div class="quick-reasons">
					<span v-for="q in CANCEL_QUICK" :key="q" class="quick-chip" :class="{ on: action.reason === quickText(q) }" @click="action.reason = quickText(q)">{{ q }}</span>
				</div>
				<a-textarea v-model="action.reason" :rows="3" maxLength="100" placeholder="取消原因（必填，客户能看到）" />
				<div class="quick-tip">微信推送只显示前 20 个字，重点写前面；订单详情里显示全文。</div>
				<div v-if="detail && detail.paidBy" class="quick-tip">这个订单已用微信支付付款，取消后会自动向微信申请全额退款（原路退回给客户）。</div>
			</template>
			<template v-else-if="action.type === 'issue'">
				<div v-if="detail && detail.invoice" class="ship-sum">
					<div>{{ INVOICE_TYPE[detail.invoice.type] }}　{{ detail.invoice.title }}</div>
					<div v-if="detail.invoice.kind !== 'personal'">税号：{{ detail.invoice.taxId }}</div>
					<div v-else>个人抬头（无税号）</div>
				</div>
				<div class="ret-addr-tip" style="color: #262626;">应开金额：<b>{{ money(detail.invoiceAmount) }}</b><span v-if="detail.refundedAmount" style="color: #fa8c16;">（订单 {{ money(detail.totalAmount) }}，已退款 {{ money(detail.refundedAmount) }}，请按应开金额开具）</span></div>
				<div class="ret-addr-tip">发票文件必须上传：客户在小程序里下载或查看，支持 PDF 或图片（JPG、PNG）。</div>
				<pdf-uploader :value="action.file" :allow-image="true" kind="invoice" @change="(f) => (action.file = f)" button-text="上传发票文件（PDF 或图片）" :removable="true" @uploading="(v) => (uploadingFile = v)" />
				<a-input v-model="action.invoiceNo" maxLength="50" placeholder="发票号码（选填）" style="margin-top: 12px;" />
			</template>
			<template v-else-if="action.type === 'invoicefile'">
				<pdf-uploader :value="action.file" :allow-image="true" kind="invoice" @change="(f) => (action.file = f)" button-text="选择发票文件（PDF 或图片）" :removable="true" @uploading="(v) => (uploadingFile = v)" />
				<div class="od-sub" style="margin: 8px 0 0;">替换后客户下载到的就是新文件，旧文件会从云存储删除。</div>
			</template>
			<template v-else-if="action.type === 'reject'">
				<a-textarea v-model="action.reason" :rows="3" maxLength="200" placeholder="驳回原因（如：税号不对），客户修改开票信息后可以重新申请" />
			</template>
			<!-- 售后：同意 / 拒绝 / 确认收到 / 重试退款 -->
			<template v-else-if="action.type && action.type.startsWith('as_') && action.sale">
				<div class="ship-sum">
					<div>订单 {{ detail.orderNo }}　订单金额 {{ money(detail.totalAmount) }}　还能退 {{ money(refundable) }}</div>
					<div>{{ AFTER_SALE_TYPE[action.sale.type] }}：{{ action.sale.reason }}</div>
				</div>
				<a-alert v-if="detail.invoiceStatus === 'issued' && action.type !== 'as_reject'" type="warning" show-icon style="margin-bottom: 12px;"
					message="这个订单已经开具发票，退款后需要财务做红字发票冲销（系统不处理）。" />
				<template v-if="action.type === 'as_approve' && action.sale.type !== 'refund'">
					<div class="ret-addr-tip">客户会按下面的地址寄回，每一项客户都能单独复制。填过一次，下次自动带出。</div>
					<a-input v-model="action.returnName" maxLength="30" addon-before="收件人" placeholder="例如 李四" style="margin-bottom: 10px;" />
					<a-input v-model="action.returnPhone" maxLength="30" addon-before="电　话" placeholder="手机或座机" style="margin-bottom: 10px;" />
					<a-input v-model="action.returnAddress" maxLength="150" addon-before="地　址" placeholder="省市区 + 详细地址" style="margin-bottom: 10px;" />
					<a-input v-model="action.note" maxLength="200" addon-before="备　注" placeholder="选填，例如「请注明订单号」" />
				</template>
				<template v-else-if="action.type === 'as_approve' || action.type === 'as_retry' || (action.type === 'as_received' && action.sale.type === 'return_refund')">
					<a-input v-model="action.amount" addon-before="退款金额 ¥" placeholder="例如 50 或 50.00" style="margin-bottom: 12px;" />
					<a-alert type="info" show-icon style="margin-bottom: 12px;" message="确定后会立即向微信申请退款，原路退回给客户；可以只退一部分。" />
					<a-textarea v-if="action.type !== 'as_retry'" v-model="action.note" :rows="2" maxLength="200" placeholder="处理说明（可选，客户能看到）" />
				</template>
				<template v-else-if="action.type === 'as_received'">
					<a-select v-model="action.carrier" placeholder="寄出新货的快递公司" style="width: 100%; margin-bottom: 12px;">
						<a-select-option v-for="c in CARRIERS" :key="c" :value="c">{{ c }}</a-select-option>
						<a-select-option :value="OTHER_CARRIER">其他（手动填写）</a-select-option>
					</a-select>
					<a-input v-if="action.carrier === OTHER_CARRIER" v-model="action.customCarrier" maxLength="50" placeholder="快递公司名称" style="margin-bottom: 12px;" />
					<a-input v-model="action.expressNo" maxLength="50" placeholder="运单号" style="margin-bottom: 12px;" />
					<a-textarea v-model="action.note" :rows="2" maxLength="200" placeholder="处理说明（可选）" />
				</template>
				<template v-else-if="action.type === 'as_reject'">
					<a-textarea v-model="action.reason" :rows="3" maxLength="200" placeholder="拒绝原因（必填，客户能看到）" />
				</template>
			</template>
			<template v-else-if="action.type === 'cancel_no'">
				<div class="ship-sum">
					<div>订单 {{ detail.orderNo }}　客户申请取消的原因：{{ detail.cancelRequest && detail.cancelRequest.reason }}</div>
				</div>
				<a-textarea v-model="action.reason" :rows="3" maxLength="200" placeholder="拒绝原因（必填，客户在订单里能看到，例如：已经打包，明天发出）" />
			</template>
			<template v-else-if="action.type === 'remark'">
				<div class="quick-label">商家备注：只有后台能看到，客户看不到。留空保存 = 清除。</div>
				<a-textarea v-model="action.note" :rows="4" maxLength="500" placeholder="例如：电话确认过，周五前发；客户要拆成两单发" />
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
import { can } from '@/utils/auth'
import PdfUploader from '@/components/PdfUploader.vue'
import ImagePicker from '@/components/ImagePicker.vue'
import { getShopOrders, getShopOrder, getShopOrderLogistics, shipShopOrder, retraceShopOrder, cancelShopOrder, markShopOrderRefunded, issueShopInvoice, rejectShopInvoice, setShopOrderRemark, approveShopCancelRequest, rejectShopCancelRequest, setShopInvoiceFile, approveAfterSale, rejectAfterSale, receivedAfterSale, retryAfterSaleRefund, bulkShipShopOrders, setShopShipPhoto, checkExpressNo, getCompanyInfo, getPdfDownloadUrl, deletePdfs } from '@/api'
import { ordersCsv, bulkShipTemplate, deliveryNotesHtml, openPrint, downloadText } from '@/utils/orderTools'
import { parseCsv } from '@/utils/shop'
import DateRangeQuick from '@/components/DateRangeQuick.vue'
import { ORDER_STATUS, REFUND_STATE, INVOICE_STATUS, INVOICE_TYPE, PAID_BY, LOG_ACTION, ACTOR, AFTER_SALE_TYPE, AFTER_SALE_STATUS, AFTER_SALE_REFUND_STATE, money } from '@/utils/shop'

// 常用快递公司（发货时下拉选择；没有的选「其他」手动填）
const CARRIERS = ['顺丰速运', '中通快递', '圆通速递', '申通快递', '韵达快递', '极兔速递', '京东物流', '德邦快递', 'EMS', '邮政包裹']
const OTHER_CARRIER = '__other__'
// 取消订单的常用原因（点一下填进输入框，还能再改；已付款的订单自动加上「，已全额退款」；推送里只显示前 20 个字，所以写得短）
const CANCEL_QUICK = ['商品缺货', '商品已下架', '价格有误', '地址无法配送', '客户要求取消']
const LAST_CARRIER_KEY = 'shipCarrier'
const lastCarrier = () => { try { return localStorage.getItem(LAST_CARRIER_KEY) || '' } catch (e) { return '' } }
const RET_ADDR_KEY = 'lastReturnAddr'
const lastReturnAddr = () => { try { return JSON.parse(localStorage.getItem(RET_ADDR_KEY)) || {} } catch (e) { return {} } }
const rememberReturnAddr = (v) => { try { localStorage.setItem(RET_ADDR_KEY, JSON.stringify(v)) } catch (e) { /* 存不了就算了 */ } }
const rememberCarrier = (c) => { try { localStorage.setItem(LAST_CARRIER_KEY, c) } catch (e) { /* 存不了就算了 */ } }

const ACTIONS = {
	ship: { title: '发货' },
	shipphoto: { title: '上传发货凭证' },
	cancel: { title: '取消订单' },
	issue: { title: '开具发票' },
	invoicefile: { title: '发票文件' },
	reject: { title: '驳回开票申请' },
	refunded: { title: '标记已退款' },
	as_approve: { title: '同意售后' },
	as_reject: { title: '拒绝售后' },
	cancel_no: { title: '拒绝取消申请' },
	remark: { title: '商家备注' },
	as_received: { title: '确认收到退货' },
	as_retry: { title: '重试退款' }
}
// 还在进行中的售后（订单列表里显示这个标签）
const ACTIVE_SALE = ['requested', 'approved', 'returning', 'refunding', 'refund_failed']

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
	components: { DateRangeQuick, PdfUploader, ImagePicker },
	data() {
		return {
			logi: null,
			logiAll: false,
			logiLoading: false,
			uploadingFile: false,
			exporting: false,
			selectedKeys: [],
			selectedMap: {}, // 勾选的订单（翻页后也保留）：id → 订单
			bulkVisible: false,
			bulk: { rows: [], okCount: 0, failCount: 0, done: false, running: false, error: '' },
			showLogs: false,
			STEP_STATE: { done: '已完成', current: '进行中', todo: '未开始', bad: '' },
			dates: [],
			ORDER_STATUS, REFUND_STATE, INVOICE_STATUS, INVOICE_TYPE, PAID_BY, LOG_ACTION, ACTOR, ACTIONS, CARRIERS, OTHER_CARRIER, CANCEL_QUICK, AFTER_SALE_TYPE, AFTER_SALE_STATUS, AFTER_SALE_REFUND_STATE,
			filters: { orderNo: '', customer: '', receiver: '', status: this.$route.query.status || undefined, invoice: undefined, todo: undefined },
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
				{ title: '订单号', dataIndex: 'orderNo', key: 'orderNo', scopedSlots: { customRender: 'orderNo' } },
				{ title: '客户', key: 'customer', scopedSlots: { customRender: 'customer' } },
				{ title: '收货人', key: 'receiver', scopedSlots: { customRender: 'receiver' } },
				{ title: '金额', dataIndex: 'totalAmount', key: 'totalAmount', scopedSlots: { customRender: 'amount' } },
				{ title: '状态', dataIndex: 'status', key: 'status', scopedSlots: { customRender: 'status' } },
				{ title: '开票', dataIndex: 'invoiceStatus', key: 'invoiceStatus', scopedSlots: { customRender: 'invoice' } },
				{ title: '备注', key: 'remark', scopedSlots: { customRender: 'remark' } },
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
		// 按客户筛选的标签文字：优先用地址里带的名字，没有就取列表里这个客户的昵称/手机号，都没有才显示编号
		customerLabel() {
			if (this.customerName) return this.customerName
			const c = this.orders[0] && this.orders[0].customer
			return (c && (c.nickname || c.phone)) || '#' + this.customerId
		},
		// 发货运单号的可疑之处（只提醒，不拦截：特殊单号、合并发货都是正常情况）
		expressHints() {
			const a = this.action
			if (!a || a.type !== 'ship') return []
			const no = String(a.expressNo || '').trim()
			if (!no) return []
			const company = a.carrier === OTHER_CARRIER ? String(a.customCarrier || '') : String(a.carrier || '')
			const out = []
			if (!/^[A-Za-z0-9-]+$/.test(no)) out.push('运单号里有空格、中文或特殊符号，请检查是不是复制多了')
			else if (no.length < 8 || no.length > 30) out.push('运单号一般是 8~30 位字母数字，请检查是否漏填或多填')
			if (this.detail && no === this.detail.orderNo) out.push('运单号和订单号一样，是不是填错了')
			if (company.includes('顺丰') && /^[A-Za-z0-9-]+$/.test(no) && !/^(SF\d{12,15}|\d{12})$/i.test(no)) out.push('顺丰运单号一般是 SF 开头加 12~15 位数字，或 12 位数字')
			if ((a.dups || []).length) out.push(`这个运单号已经用在订单 ${a.dups.map((d) => d.orderNo).join('、')} 上（同一个包裹合并发多个订单可以忽略）`)
			return out
		},
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
			// 已经全额退款（售后）：流程到退款就结束了，不再显示「确认收货」「开具发票」
			if (d.fullyRefunded) {
				const sale = (d.afterSales || []).find((x) => x.status === 'refunded')
				return [
					S('提交订单', 'done', d.createdAt),
					S('支付成功', 'done', d.paidAt || at('wechat_paid')),
					S('商家发货', 'done', at('ship'), d.expressNo ? `${d.expressCompany} ${d.expressNo}` : ''),
					S('已全额退款', 'done', (sale && sale.refundedAt) || at('after_sales_refunded', 'wechat_refunded'), `售后退款 ${money(d.refundedAmount)}`)
				]
			}
			return [
				S('提交订单', 'done', d.createdAt),
				paid ? S('支付成功', 'done', d.paidAt || at('wechat_paid')) : S('等待付款', 'current', '', '超时会自动取消'),
				shipped ? S('商家发货', 'done', at('ship'), d.expressNo ? `${d.expressCompany} ${d.expressNo}` : '') : S('商家发货', paid ? 'current' : 'todo'),
				d.status === 'completed' ? S('确认收货', 'done', at('receive', 'auto_receive')) : S('确认收货', d.status === 'shipped' ? 'current' : 'todo'),
				inv === 'issued' ? S('开具发票', 'done', at('invoice_issue'), d.invoiceNo ? `发票号码 ${d.invoiceNo}` : '')
					: inv === 'requesting' ? S('开具发票', 'current', at('invoice_apply'), '客户已申请，等待开具')
						: S('开具发票', 'todo', '', '客户未申请')
			]
		},
		// 这个订单还能退多少钱：订单金额 − 已经退了和正在退的售后退款
		refundable() {
			const d = this.detail
			if (!d) return 0
			const used = (d.afterSales || []).filter((s) => ['refunding', 'refunded'].includes(s.status)).reduce((n, s) => n + Math.round((s.refundAmount || 0) * 100), 0)
			return Math.max(0, Math.round(d.totalAmount * 100) - used) / 100
		}
	},
	beforeDestroy() {
		clearTimeout(this.flashTimer)
	},
	watch: {
		// 地址上的查询条件变了：点了右上角通知（highlight），或「客户管理 → 查看订单」/清除客户筛选（customerId）
		'$route.query'(q, old) {
			if (q.status && (q.status !== old.status || q.n !== old.n)) {
				// 汇总通知（N 个订单超时没发货）：按状态筛
				this.dates = []
				this.filters = { orderNo: '', customer: '', receiver: '', status: q.status, invoice: undefined, todo: undefined }
				this.customerId = ''
				this.customerName = ''
				return this.handleSearch()
			}
			if (q.highlight) {
				// 通知：回到完整的订单列表（清掉筛选），找到这一单让它闪
				this.wantFlash = q.highlight
				this.dates = []
				this.filters = { orderNo: '', customer: '', receiver: '', status: undefined, invoice: undefined, todo: undefined }
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
		can, // 模板里按功能权限显示操作（服务端也会拦）
		// 运单号填完后（离开输入框时）查一下有没有被别的订单用过；只提醒不拦截
		async checkDuplicates() {
			const no = String((this.action && this.action.expressNo) || '').trim()
			if (!no || !this.detail) { this.action.dups = []; return }
			try { this.action.dups = (await checkExpressNo(no, this.detail.id)) || [] } catch (e) { this.action.dups = [] }
		},
		// 发货前最后确认：把快递、运单号、收货人再摆一遍，有可疑的地方一起列出来
		confirmShip(company, a) {
			const d = this.detail
			const h = this.$createElement
			const warns = [...this.expressHints]
			return new Promise((resolve) => {
				this.$confirm({
					title: '确认发货？',
					okText: '确认发货',
					cancelText: '再检查一下',
					content: h('div', { style: 'line-height: 24px;' }, [
						h('div', `订单：${d.orderNo}`),
						h('div', `快递：${company}　运单号：${a.expressNo.trim()}`),
						d.address ? h('div', `收货人：${d.address.consignee}　${d.address.phone}`) : null,
						d.address ? h('div', `地址：${d.address.region} ${d.address.detail}`) : null,
						h('div', { style: 'color: #8c8c8c;' }, a.photo && a.photo.fileID ? '已附发货凭证照片' : '未附发货凭证照片（选填）'),
						...warns.map((w) => h('div', { style: 'color: #fa8c16; margin-top: 4px;' }, '⚠ ' + w)),
						h('div', { style: 'color: #8c8c8c; margin-top: 8px;' }, '发货后会把快递信息录入微信，客户在微信订单里能看到，录入后不一定能再改。')
					]),
					onOk: () => resolve(true),
					onCancel: () => resolve(false)
				})
			})
		},
		clearShipPhoto() {
			this.$confirm({
				title: '清除发货凭证照片？',
				content: '清除后无法恢复。',
				okText: '清除',
				cancelText: '取消',
				onOk: async () => {
					try {
						this.detail = await setShopShipPhoto(this.detail.id, '')
						this.$message.success('已清除')
					} catch (error) { notifyError(this, error, '清除失败') }
				}
			})
		},
		quickText(q) {
			return this.detail && this.detail.paidBy ? q + '，已全额退款' : q
		},
		money,
		async fetch() {
			try {
				this.loading = true
				const data = await getShopOrders({ ...this.queryParams(), page: this.pagination.current, pageSize: this.pagination.pageSize })
				this.orders = data.list
				this.pagination.total = data.total
				this.flashIfWanted()
			} catch (error) {
				notifyError(this, error, '获取订单列表失败')
			} finally {
				this.loading = false
			}
		},
		// ---- 导出、批量发货、打印发货单 ----
		queryParams() {
			const f = this.filters
			return { customerId: this.customerId || undefined, orderNo: f.orderNo.trim(), customer: f.customer.trim(), receiver: f.receiver.trim(), from: this.dates.length === 2 ? this.dates[0].format('YYYY-MM-DD') : undefined, to: this.dates.length === 2 ? this.dates[1].format('YYYY-MM-DD') : undefined, status: f.status, invoice: f.invoice, refundPending: f.todo === 'refund' ? 'true' : undefined, afterSales: f.todo === 'afterSales' ? 'pending' : undefined, cancelRequest: f.todo === 'cancelRequest' ? 'pending' : undefined }
		},
		// 导出当前筛选条件下的全部订单（最多 5000 单）。分页取，不一次拉太多
		// 当前搜索条件的文字说明（导出前的确认里用）
		filterSummary() {
			const f = this.filters
			const parts = []
			if (this.customerId) parts.push('客户：' + this.customerLabel)
			if (f.orderNo.trim()) parts.push('订单号：' + f.orderNo.trim())
			if (f.customer.trim()) parts.push('客户：' + f.customer.trim())
			if (f.receiver.trim()) parts.push('收货人/电话：' + f.receiver.trim())
			if (this.dates.length === 2) parts.push('下单日期：' + this.dates[0].format('YYYY-MM-DD') + ' 至 ' + this.dates[1].format('YYYY-MM-DD'))
			if (f.status) parts.push('订单状态：' + ORDER_STATUS[f.status].text)
			if (f.invoice) parts.push('开票状态：' + INVOICE_STATUS[f.invoice].text)
			if (f.todo) parts.push('待处理事项：' + ({ refund: '需要退款', afterSales: '售后待处理', cancelRequest: '客户申请取消' }[f.todo] || f.todo))
			return parts
		},
		// 导出前先确认：说清楚导出的是当前搜索条件下的订单、一共多少单
		exportOrders() {
			const h = this.$createElement
			const parts = this.filterSummary()
			const total = this.pagination.total
			this.$confirm({
				title: '导出订单',
				width: 420,
				okText: '确认导出',
				cancelText: '取消',
				content: h('div', [
					h('div', ['将导出', h('b', ' 当前搜索结果 '), `共 ${total} 单（最多 5000 单）。`]),
					h('div', { style: 'margin-top: 8px; color: #8c8c8c;' }, parts.length ? '搜索条件：' + parts.join('；') : '当前没有设置搜索条件，会导出全部订单。')
				]),
				onOk: () => this.doExport()
			})
		},
		async doExport() {
			const MAX = 5000
			try {
				this.exporting = true
				const all = []
				for (let page = 1; all.length < MAX; page++) {
					const data = await getShopOrders({ ...this.queryParams(), page, pageSize: 100 })
					all.push(...data.list)
					if (page * 100 >= data.total || !data.list.length) break
				}
				if (!all.length) return this.$message.warning('当前条件下没有订单')
				const stamp = new Date().toISOString().slice(0, 10)
				downloadText(ordersCsv(all.slice(0, MAX)), `订单导出-${stamp}.csv`)
				this.$message.success(`已导出 ${Math.min(all.length, MAX)} 单${all.length > MAX ? `（超过 ${MAX} 单，请缩小筛选范围分批导出）` : ''}`)
			} catch (error) {
				notifyError(this, error, '导出失败')
			} finally {
				this.exporting = false
			}
		},
		downloadTemplate() {
			downloadText(bulkShipTemplate(), '批量发货模板.csv')
		},
		openBulk() {
			this.bulk = { rows: [], okCount: 0, failCount: 0, done: false, running: false, error: '' }
			this.bulkVisible = true
		},
		onBulkFile(e) {
			const file = e.target.files[0]
			e.target.value = ''
			if (!file) return
			if (file.size > 1024 * 1024) return this.$message.error('文件太大（最多 1MB）')
			const reader = new FileReader()
			reader.onload = () => this.previewBulk(String(reader.result))
			reader.onerror = () => this.$message.error('读取文件失败')
			reader.readAsText(file, 'utf-8')
		},
		// 解析 CSV → 服务端 dryRun 检查每一行 → 显示预览
		async previewBulk(text) {
			const rows = parseCsv(text)
			const fail = (msg) => { this.bulk = { rows: [], okCount: 0, failCount: 0, done: false, running: false, error: msg } }
			if (rows.length < 2) return fail('表格里没有数据')
			const head = rows[0].map((h) => h.trim())
			const col = (name) => head.findIndex((h) => h.startsWith(name))
			const idx = { no: col('订单号'), company: col('快递公司'), express: col('运单号') }
			if (idx.no < 0 || idx.company < 0 || idx.express < 0) return fail('第一行必须有「订单号」「快递公司」「运单号」三列（建议先下载模板）')
			if (rows.length - 1 > 200) return fail('一次最多导入 200 行，请分批导入')
			const cell = (r, k) => (r[idx[k]] !== undefined ? r[idx[k]].trim() : '')
			const items = rows.slice(1).map((r) => ({ orderNo: cell(r, 'no'), expressCompany: cell(r, 'company'), expressNo: cell(r, 'express') }))
			try {
				const res = await bulkShipShopOrders(items, true)
				this.bulk = { rows: res.results.map((r) => ({ ...r, line: r.index + 2, expressCompany: items[r.index].expressCompany, expressNo: items[r.index].expressNo })), okCount: res.okCount, failCount: res.failCount, done: false, running: false, error: '', items }
			} catch (error) {
				fail('检查失败：' + (error.message || '请重试'))
			}
		},
		async runBulk() {
			try {
				this.bulk.running = true
				// 只发预览里没问题的行（有问题的行服务端本来也会拒绝）
				const items = this.bulk.items.filter((_, i) => this.bulk.rows[i].ok)
				const res = await bulkShipShopOrders(items, false)
				const byNo = new Map(res.results.map((r) => [r.orderNo, r]))
				this.bulk.rows = this.bulk.rows.map((r) => (r.ok ? { ...r, ...byNo.get(r.orderNo), line: r.line, expressCompany: r.expressCompany, expressNo: r.expressNo } : r))
				this.bulk.okCount = res.okCount
				this.bulk.failCount = this.bulk.rows.filter((r) => !r.ok).length
				this.bulk.done = true
				this.$message.success(`已发货 ${res.okCount} 单`)
				this.fetch()
			} catch (error) {
				notifyError(this, error, '批量发货失败')
			} finally {
				this.bulk.running = false
			}
		},
		onSelect(keys, rows) {
			// 翻页后 rows 只有当前页：用 id → 订单 的表保留之前页勾选的
			const map = {}
			keys.forEach((k) => { map[k] = this.selectedMap[k] || rows.find((r) => r.id === k) })
			this.selectedMap = map
			this.selectedKeys = keys
		},
		async print(orders) {
			let name = ''
			try {
				const c = await getCompanyInfo()
				name = (c && c.data && c.data.name) || ''
			} catch (e) { /* 取不到公司名就不印 */ }
			const opened = openPrint(deliveryNotesHtml(orders, name))
			if (!opened) this.$message.warning('浏览器拦截了打印窗口，请允许本页面弹出窗口后重试')
			return !!opened
		},
		printOne(o) {
			this.print([o])
		},
		// 打印勾选的订单：打印窗口打开了就清掉勾选（印完不用再手动一个个取消）；被浏览器拦截没打开时保留勾选，允许弹窗后可以直接重试
		async printSelected() {
			const opened = await this.print(this.selectedKeys.map((k) => this.selectedMap[k]).filter(Boolean))
			if (opened) {
				this.selectedKeys = []
				this.selectedMap = {}
			}
		},
		// 这个订单现在进行中的售后（列表里显示标签）
		activeSale(record) {
			return (record.afterSales || []).find((s) => ACTIVE_SALE.includes(s.status)) || null
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
			} else if (this.filters.orderNo !== no) {
				this.filters.orderNo = no
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
		// 重置：清空关键词、状态、开票状态、两个开关和「按客户筛选」，回到第一页；地址栏里带的筛选条件也一起去掉
		handleReset() {
			this.dates = []
			this.filters = { orderNo: '', customer: '', receiver: '', status: undefined, invoice: undefined, todo: undefined }
			this.customerId = ''
			this.customerName = ''
			if (Object.keys(this.$route.query).length) this.$router.replace({ path: '/shop/orders' }).catch(() => {})
			this.handleSearch()
		},
		// 客户框里输入：正在按客户筛选时，清空或改字都先取消按客户筛选，再当作普通搜索词
		onCustomerInput(e) {
			const v = e.target.value
			if (this.customerId) {
				this.customerId = ''
				this.customerName = ''
				if (Object.keys(this.$route.query).length) this.$router.replace({ path: '/shop/orders' }).catch(() => {})
				this.filters.customer = ''
				if (!v) return this.handleSearch()
			}
			this.filters.customer = v
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
				this.loadLogi(id)
			} catch (error) {
				this.detailVisible = false
				notifyError(this, error, '获取订单详情失败')
			} finally {
				this.detailLoading = false
			}
		},
		// 物流状态：向微信查（服务端缓存 3 分钟），只有传过运单的订单有；查不到不报错，显示「暂时查不到」
		async loadLogi(id) {
			this.logi = null
			this.logiAll = false
			if (!this.detail || !this.detail.waybillToken) return
			this.logiLoading = true
			try {
				const r = await getShopOrderLogistics(id)
				if (this.detail && this.detail.id === id) this.logi = r
			} catch (e) {
				/* 查不到就显示「暂时查不到」 */
			} finally {
				this.logiLoading = false
			}
		},
		logiColor(s) {
			return { 0: 'default', 1: 'blue', 2: 'blue', 3: 'orange', 4: 'green', 5: 'red', 6: 'green' }[s] || 'default'
		},
		openAction(type, sale) {
			const last = lastCarrier()
			// 上次用的快递公司默认选上（常发一家的话少点一次）。售后的操作带上这条售后，退款金额默认填还能退的全部
			this.action = { type, sale: sale || null, amount: sale ? String(this.refundable) : '', note: '', reason: '', carrier: CARRIERS.includes(last) ? last : undefined, customCarrier: '', expressNo: '', invoiceNo: '', file: null, photo: null, dups: [], ...(type === 'as_approve' ? (({ name, phone, address }) => ({ returnName: name || '', returnPhone: phone || '', returnAddress: address || '' }))(lastReturnAddr()) : {}) }
			if (type === 'remark') this.action.note = (this.detail && this.detail.adminRemark) || ''
			this.uploadingFile = false
			this.actionVisible = true
		},
		// 「更多」菜单里的操作（按订单状态只列能做的）。divider 是分隔线：处理类、记录类、危险操作各一组
		// 开具 / 驳回发票后的提示：订阅通知（微信里给客户的服务通知）发出去了没有、没发的原因
		notifyHint(code, type) {
			const what = type === 'issue' ? '发票已开具' : '已驳回开票申请'
			const base = '已处理，但没有通知到客户：'
			if (!code || code === 'sent') return { text: `${what}，已通知客户` }
			const reasons = {
				no_quota: base + '客户提交开票申请时没有点「允许」接收通知（或授权的次数已用完）。客户仍然可以在小程序订单里看到结果',
				disabled: base + '开票通知功能没开，服务端没有配置开票通知的模板（环境变量 SUBSCRIBE_TEMPLATE_INVOICE）',
				bad_data: base + '开票通知的字段配置（环境变量 SUBSCRIBE_INVOICE_DATA）格式不对',
				refused: base + '微信拒绝发送：多半是模板 ID 或字段配置和微信后台里的模板对不上，请检查',
				no_openid: base + '找不到这个客户的微信标识',
				error: base + '发送时出错（超时等），详情看服务端日志'
			}
			return { warn: true, text: reasons[code] || base + '原因不明（' + code + '）' }
		},
		// 每个菜单项需要的功能权限；没有权限的项不显示（服务端也会拦）。没写的（打印发货单）谁都可以
		menuPerm(key) {
			return {
				ship: 'order.ship', retrace: 'order.ship', shipphoto: 'order.ship', remark: 'order.remark',
				cancel: 'order.cancel', cancel_ok: 'order.cancel', cancel_no: 'order.cancel', refunded: 'order.cancel',
				as_approve: 'aftersales.handle', as_reject: 'aftersales.handle', as_received: 'aftersales.handle', as_retry: 'aftersales.handle',
				issue: 'invoice.handle', reject: 'invoice.handle', invoicefile: 'invoice.handle'
			}[key]
		},
		moreItems(r) {
			const out = []
			const add = (key, label, danger) => { const p = this.menuPerm(key); if (!p || can(p)) out.push({ key, label, danger: !!danger }) }
			const sale = this.activeSale(r)
			if (r.status === 'pending_ship') add('ship', '发货')
			if (r.status === 'pending_ship' && r.cancelRequest && r.cancelRequest.status === 'pending') {
				add('cancel_ok', '同意取消')
				add('cancel_no', '拒绝取消', true)
			}
			if (sale && sale.status === 'requested') {
				add('as_approve', sale.type === 'refund' ? '同意并退款' : '同意售后')
				add('as_reject', '拒绝售后', true)
			} else if (sale && sale.status === 'returning') {
				add('as_received', sale.type === 'exchange' ? '确认收货并寄新货' : '确认收货并退款')
				add('as_reject', '验货拒绝', true)
			} else if (sale && sale.status === 'refund_failed') add('as_retry', '重试退款')
			if (r.refundPending) add('refunded', '标记已退款', true)
			if (r.invoiceStatus === 'requesting') {
				add('issue', '开发票')
				add('reject', '驳回开票')
			}
			if (out.length) out.push({ key: 'd1', divider: true })
			add('remark', '商家备注')
			if (r.invoiceStatus === 'issued') add('invoicefile', '发票文件')
			if (r.expressNo) add('shipphoto', '发货凭证')
			// 发货时没传成功（微信繁忙、当时没开通）的订单：客户在小程序里看不到「查看物流」，可以补传
			if (['shipped', 'completed'].includes(r.status) && r.expressNo && !r.waybillToken) add('retrace', '补传物流')
			add('print', '打印发货单')
			if (['pending_payment', 'pending_ship'].includes(r.status)) {
				out.push({ key: 'd2', divider: true })
				add('cancel', '取消订单', true)
			}
			return out
		},
		// 有没有要后台处理的事（「更多」上的小点）
		needsAction(r) {
			const sale = this.activeSale(r)
			return !!(
				(can('order.cancel') && r.cancelRequest && r.cancelRequest.status === 'pending' && r.status === 'pending_ship') ||
				(can('aftersales.handle') && sale && ['requested', 'returning', 'refund_failed'].includes(sale.status)) ||
				(can('order.cancel') && r.refundPending) ||
				(can('invoice.handle') && r.invoiceStatus === 'requesting')
			)
		},
		onMore(r, key) {
			if (key === 'cancel_ok') return this.approveCancel(r)
			if (key === 'print') return this.printOne(r)
			if (key === 'retrace') return this.retrace(r)
			if (key.startsWith('as_')) return this.quickAction(r, key, this.activeSale(r))
			this.quickAction(r, key)
		},
		// 补传物流：把运单再传给微信物流查询组件，成功后客户在小程序里就能看到「查看物流轨迹」
		async retrace(order) {
			try {
				const res = await retraceShopOrder(order.id)
				if (res.trace && res.trace.ok) this.$message.success('已传给微信，客户可以在小程序里查看物流轨迹了')
				else this.$message.warning('没有传成功：' + ((res.trace && res.trace.reason) || '原因不明'), 6)
				this.fetch()
			} catch (error) {
				notifyError(this, error, '补传物流失败')
			}
		},
		// 同意客户的取消申请：订单会被取消，已付款的金额自动原路退回，库存回补
		approveCancel(order) {
			this.$confirm({
				title: '同意取消这个订单？',
				content: `订单 ${order.orderNo}（${money(order.totalAmount)}）会被取消，已付款的金额自动原路退回给客户，库存回补。`,
				okText: '同意并退款',
				okType: 'danger',
				cancelText: '再想想',
				onOk: async () => {
					try {
						this.detail = await approveShopCancelRequest(order.id)
						this.$message.success('已取消订单，退款已提交')
						this.fetch()
					} catch (error) {
						notifyError(this, error, '操作失败')
						try { this.detail = await getShopOrder(order.id) } catch (e) { /* 保留当前显示 */ }
						this.fetch()
					}
				}
			})
		},
		// 列表「备注」列的内容：客户备注、取消原因、最近一次售后（原因 + 商家处理说明）。没有的不显示
		remarkLines(o) {
			const out = []
			if (o.adminRemark) out.push({ k: 'a', label: '商家：', text: o.adminRemark, full: o.adminRemark, cls: 'rm-admin' })
			if (o.remark) out.push({ k: 'c', label: '客户：', text: o.remark, full: o.remark, cls: 'rm-cust' })
			if (o.cancelRequest && o.cancelRequest.status === 'pending') out.push({ k: 'q', label: '申请取消：', text: o.cancelRequest.reason, full: o.cancelRequest.reason, cls: 'rm-cust' })
			if (o.status === 'cancelled' && o.cancelReason) out.push({ k: 'x', label: '取消：', text: o.cancelReason, full: o.cancelReason, cls: '' })
			const s = (o.afterSales || [])[0]
			if (s) {
				out.push({ k: 's', label: '售后：', text: s.reason, full: s.reason + (s.description ? '（' + s.description + '）' : ''), cls: '' })
				if (s.adminNote) out.push({ k: 'n', label: '处理：', text: s.adminNote, full: s.adminNote, cls: '' })
			}
			return out
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
			const p = this.action && this.action.photo
			if (p && p.fileID) deletePdfs([p.fileID])
		},
		// 列表里直接操作（发货、取消、标记已退款、开发票）：不用先打开详情
		// 需要完整订单信息的操作（售后、发货凭证、发票文件、驳回开票）先取最新详情，其余直接用列表这一行
		async quickAction(record, type, sale) {
			if (['as_approve', 'as_reject', 'as_received', 'as_retry', 'shipphoto', 'invoicefile', 'reject'].includes(type)) {
				try {
					this.detail = await getShopOrder(record.id)
				} catch (error) {
					return notifyError(this, error, '获取订单失败')
				}
				const fresh = sale && (this.detail.afterSales || []).find((x) => x.id === sale.id)
				if (sale && !fresh) return this.$message.warning('这条售后已经变化，请刷新后再试')
				return this.openAction(type, fresh || null)
			}
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
				if (!(await this.confirmShip(company, a))) return
				call = () => shipShopOrder(id, { expressCompany: company, expressNo: a.expressNo.trim(), ...(a.photo && a.photo.fileID ? { photoFileID: a.photo.fileID } : {}) })
			} else if (a.type === 'shipphoto') {
				if (!a.photo || !a.photo.fileID) { this.$message.warning('请先选择图片'); return }
				call = () => setShopShipPhoto(id, a.photo.fileID)
			} else if (a.type === 'cancel') {
				if (!need(a.reason, '请填写取消原因')) return
				call = () => cancelShopOrder(id, a.reason.trim())
			} else if (a.type === 'issue') {
				if (!a.file || !a.file.fileID) { this.$message.warning('请上传发票文件（PDF 或图片），客户要在小程序里下载'); return }
				call = () => issueShopInvoice(id, String(a.invoiceNo || '').trim(), a.file)
			} else if (a.type === 'invoicefile') {
				if (!a.file || !a.file.fileID) { this.$message.warning('请先选择发票文件'); return }
				call = () => setShopInvoiceFile(id, a.file)
			} else if (a.type === 'reject') {
				if (!need(a.reason, '请填写驳回原因')) return
				call = () => rejectShopInvoice(id, a.reason.trim())
			} else if (a.type === 'as_approve' && a.sale.type !== 'refund') {
				if (!need(a.returnName, '请填写收件人') || !need(a.returnPhone, '请填写电话') || !need(a.returnAddress, '请填写退货地址')) return
				if (!/^[0-9+\-\s()]{5,30}$/.test(a.returnPhone.trim())) { this.$message.warning('电话只能填数字、+、-、空格和括号'); return }
				call = () => approveAfterSale(a.sale.id, { returnName: a.returnName.trim(), returnPhone: a.returnPhone.trim(), returnAddress: a.returnAddress.trim(), note: a.note.trim() })
			} else if (['as_approve', 'as_retry'].includes(a.type) || (a.type === 'as_received' && a.sale.type === 'return_refund')) {
				if (!/^\d+(\.\d{1,2})?$/.test(String(a.amount).trim()) || !(Number(a.amount) > 0)) { this.$message.warning('请填写退款金额（大于 0，最多两位小数）'); return }
				if (Number(a.amount) > this.refundable + 1e-9) { this.$message.warning(`退款金额不能超过还能退的 ${money(this.refundable)}`); return }
				const amount = String(a.amount).trim()
				if (a.type === 'as_retry') call = () => retryAfterSaleRefund(a.sale.id, amount)
				else if (a.type === 'as_approve') call = () => approveAfterSale(a.sale.id, { amount, note: a.note.trim() })
				else call = () => receivedAfterSale(a.sale.id, { amount, note: a.note.trim() })
			} else if (a.type === 'as_received') {
				const company = a.carrier === OTHER_CARRIER ? String(a.customCarrier || '').trim() : a.carrier
				if (!need(a.carrier, '请选择快递公司') || !need(company, '请填写快递公司名称') || !need(a.expressNo, '请填写运单号')) return
				call = () => receivedAfterSale(a.sale.id, { replaceCompany: company, replaceNo: a.expressNo.trim(), note: a.note.trim() })
			} else if (a.type === 'as_reject') {
				if (!need(a.reason, '请填写拒绝原因')) return
				call = () => rejectAfterSale(a.sale.id, a.reason.trim())
			} else if (a.type === 'cancel_no') {
				if (!need(a.reason, '请填写拒绝原因')) return
				call = () => rejectShopCancelRequest(id, a.reason.trim())
			} else if (a.type === 'remark') call = () => setShopOrderRemark(id, a.note.trim())
			else if (a.type === 'refunded') call = () => markShopOrderRefunded(id, a.note.trim())
			else return
			try {
				this.acting = true
				const res = await call()
				this.detail = res
				if (a.type === 'ship' && CARRIERS.includes(a.carrier)) rememberCarrier(a.carrier)
				if (a.type === 'as_approve' && a.sale.type !== 'refund') rememberReturnAddr({ name: a.returnName.trim(), phone: a.returnPhone.trim(), address: a.returnAddress.trim() })
				this.actionVisible = false
				// 开具 / 驳回发票后，告诉财务订阅通知有没有发给客户、没发的话是为什么
				const hint = ['issue', 'reject'].includes(a.type) ? this.notifyHint(res && res.notify, a.type) : null
				if (hint && hint.warn) this.$message.warning(hint.text, 8)
				else this.$message.success(hint ? hint.text : '操作成功')
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
.tool-btns { float: right; }
.tool-btns .ant-btn { margin-left: 8px; }
.bulk-top { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
.bulk-sum { margin: 14px 0 8px; }
.bulk-list { max-height: 360px; overflow-y: auto; border: 1px solid #f0f0f0; border-radius: 6px; padding: 0 10px; }
.bulk-foot { margin-top: 14px; text-align: right; }
.bulk-foot .ant-btn { margin-left: 8px; }
.row-actions { gap: 4px 14px; }
.more-link { position: relative; white-space: nowrap; }
.more-link .anticon { font-size: 10px; margin-left: 3px; }
.more-dot { position: absolute; top: -2px; right: -8px; width: 6px; height: 6px; border-radius: 50%; background: #fa8c16; }
.act-danger { color: #cf1322; }
.as-block { padding: 10px 0 4px; border-top: 1px dashed #f0f0f0; }
.as-block:first-of-type { border-top: 0; padding-top: 0; }
.as-head { display: flex; align-items: center; margin-bottom: 6px; }
.as-actions { padding: 8px 0 8px 0; }
.as-actions .ant-btn { margin-right: 8px; }
/* 发货运单号的可疑提醒 */
.ship-warn { margin-top: 6px; color: #fa8c16; font-size: 12px; }
.quick-label { color: #8c8c8c; font-size: 12px; margin-bottom: 8px; }
.quick-reasons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.quick-chip { padding: 2px 12px; line-height: 24px; border: 1px solid #d9d9d9; border-radius: 14px; color: #595959; background: #fff; cursor: pointer; user-select: none; transition: all .15s; }
.quick-chip:hover { color: #1890ff; border-color: #1890ff; }
.quick-chip.on { color: #fff; background: #1890ff; border-color: #1890ff; }
.quick-tip { margin-top: 6px; color: #8c8c8c; font-size: 12px; }
.ship-sum { background: #fafafa; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; line-height: 22px; color: #595959; }
.od-sum { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 16px 20px; margin-bottom: 16px; background: #f5f9ff; border-radius: 8px; }
.od-sum-main { text-align: right; }
.od-tags { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 4px; }
.od-status { font-size: 14px; padding: 2px 12px; }
.od-total { font-size: 28px; font-weight: 600; line-height: 38px; color: #262626; }
.od-sum-meta { line-height: 24px; color: #262626; font-size: 13px; }
.od-sum-meta .k { display: inline-block; width: 64px; color: #8c8c8c; }
.od-muted { color: #8c8c8c; }
.od-trace { line-height: 20px; color: #8c8c8c; margin-bottom: 4px; word-break: break-all; }
.od-trace.is-first { color: #262626; }
.od-copy { margin-left: 10px; font-size: 12px; }
.ret-addr-tip { color: #8c8c8c; font-size: 12px; margin-bottom: 10px; }
.rm {
	font-size: 12px;
	line-height: 18px;
	color: #8c8c8c;
	cursor: pointer;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	word-break: break-all;
}
.rm + .rm { margin-top: 2px; }
.rm-cust { color: #d46b08; }
.rm-admin { color: #531dab; }
.rm-admin-text { color: #531dab; }
.rm:hover { color: #1890ff; }
.cust-deleted { color: #8c8c8c; cursor: help; }
.copy-cell { cursor: pointer; }
.copy-cell:hover { color: #1890ff; }
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
