<template>
	<div>
		<!-- 筛选 + 全局最低价（紧凑的一张卡片，给下面的列表多留高度） -->
		<a-card :bordered="false" class="mb-24 top-card" :bodyStyle="{ padding: '12px 24px' }">
			<div class="toolbar">
				<div class="filters">
					<a-select v-model="categoryId" placeholder="全部分类" allowClear style="width: 160px;" @change="onCategoryChange">
						<a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
					</a-select>
					<a-select v-model="catalogId" placeholder="全部目录" allowClear style="width: 160px;" @change="handleSearch">
						<a-select-option v-for="c in catalogOptions" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
					</a-select>
					<a-input-search v-model="keyword" placeholder="搜索产品名称" style="width: 160px;" allowClear @search="handleSearch" />
					<a-select v-model="filter" style="width: 160px;" @change="handleSearch">
						<a-select-option value="">全部产品</a-select-option>
						<a-select-option value="unconfigured">还没设置价格</a-select-option>
						<a-select-option value="onSale">上架中</a-select-option>
						<a-select-option value="offSale">已下架</a-select-option>
						<a-select-option value="belowMin">低于全局最低价</a-select-option>
					</a-select>
					<a-button type="primary" @click="handleSearch"><a-icon type="search" /> 搜索</a-button>
					<a-button @click="handleReset">重置</a-button>
				</div>
				<div style="margin-left: auto;">
					<a-button :loading="exporting" @click="exportCsv" style="margin-right: 8px;">导出（CSV）</a-button>
					<a-button v-can="'price.edit'" :loading="importing" @click="$refs.file.click()">导入（CSV）</a-button>
					<input ref="file" type="file" accept=".csv,text/csv" style="display: none;" @change="onFile" />
				</div>
			</div>
			<!-- 全局最低价：一行 -->
			<div class="row min-row">
				<span class="label-inline">全局最低价</span>
				<a-switch v-model="min.enabled" size="small" :disabled="!main" />
				<span class="gap">{{ min.enabled ? '已开启，价格不能低于' : '未开启' }}</span>
				<a-input-number v-model="min.price" :min="0" :max="LIMITS.priceMax" :precision="2" :step="1" :disabled="!main" size="small" style="width: 110px;" />
				<span class="gap">元</span>
				<a-button v-if="main" type="primary" size="small" :loading="min.saving" :disabled="!minDirty" @click="saveMin">保存</a-button>
				<span v-else class="muted gap">（只有主账号能修改）</span>
				<a-tooltip title="开启后：设置的价格不能低于这个金额，低于它的产品不能上架；已经在售但价格偏低的产品会从商城里隐藏、也不能下单，需要调价。关闭后恢复，金额会保留。没有价格的产品不会出现在商城里，也不能上架；价格单位是元（最多两位小数）。">
					<a-icon type="question-circle" style="margin-left: 12px; color: #8c8c8c;" />
				</a-tooltip>
				<a v-if="belowMinCount > 0" class="warn" style="margin-left: 16px;" @click="showBelowMin">⚠ 有 {{ belowMinCount }} 个在售产品低于最低价，已从商城隐藏，点这里查看</a>
			</div>
		</a-card>

		<a-card :bordered="false">
			<!-- 批量操作入口：点开弹窗，不常驻页面 -->
			<div v-can="'price.edit'" class="batch-bar" style="margin-bottom: 12px;">
				<div class="batch-hint">
					<span class="muted">{{ selectedKeys.length ? '已勾选 ' + selectedKeys.length + ' 个产品' : '可以先勾选产品，也可以对当前筛选结果的全部产品操作' }}</span>
					<a v-if="selectedKeys.length" style="margin-left: 8px;" @click="selectedKeys = []">清除勾选</a>
				</div>
				<a-button type="primary" @click="openBatch()"><a-icon type="edit" /> 批量设置</a-button>
				<a-button style="margin-left: 8px;" @click="openBatch('on')">一键上架</a-button>
				<a-button type="danger" ghost style="margin-left: 8px;" @click="openBatch('off')">一键下架</a-button>
			</div>
			<a-table :scroll="tableScroll" :rowClassName="(r) => (r.productId === focusId ? 'row-focus' : '')" rowKey="productId" :columns="columns" :dataSource="rows" :pagination="pagination" :loading="loading" :rowSelection="rowSelection" @change="handleTableChange">
				<template slot="name" slot-scope="text, record">
					<a class="name-link" @click="openDetail(record)">{{ text }}</a>
					<div style="color: #8c8c8c; font-size: 12px;">{{ record.catalog ? (record.catalog.category ? record.catalog.category.name + ' / ' : '') + record.catalog.name : '' }}</div>
					<a-tooltip v-if="record.catalog && record.catalog.showInMall === false" title="这个产品所在的目录设成了「不在商城展示」，商城里看不到它、也不能下单（上架状态和价格不受影响）。要展示请到「产品目录」里打开。">
						<a-tag color="orange" style="margin-top: 4px;">目录不在商城展示</a-tag>
					</a-tooltip>
				</template>
				<template slot="tiers" slot-scope="text, record">
					<a-tooltip v-if="(record.tiers && record.tiers.length) || (record.memberTiers && record.memberTiers.length)" placement="right">
						<div slot="title">
							<div v-for="t in record.tiers" :key="'n' + t.minQty">{{ t.minQty }} 件起 ¥{{ Number(t.price).toFixed(2) }}</div>
							<div v-for="t in record.memberTiers" :key="'m' + t.minQty">会员 {{ t.minQty }} 件起 ¥{{ Number(t.price).toFixed(2) }}</div>
						</div>
						<span class="tier-sum">
							<span v-if="record.tiers && record.tiers.length">{{ record.tiers.length }} 档</span>
							<span v-if="record.memberTiers && record.memberTiers.length" class="tier-member">会员 {{ record.memberTiers.length }} 档</span>
						</span>
					</a-tooltip>
					<span v-else class="muted">无</span>
				</template>
				<template slot="price" slot-scope="text, record">
					<span v-if="record.configured">¥{{ Number(record.price).toFixed(2) }}</span><span v-else class="muted">未设置</span>
					<div v-if="record.belowMin" style="margin-top: 4px;"><a-tag color="red">低于最低价</a-tag></div>
				</template>
				<template slot="memberPrice" slot-scope="text, record">
					<span v-if="record.configured && record.memberPrice">¥{{ Number(record.memberPrice).toFixed(2) }}</span><span v-else class="muted">无</span>
				</template>
				<template slot="stock" slot-scope="text, record">
					<span v-if="record.configured && record.stockUnlimited" class="unlimited">不限</span>
					<span v-else :style="{ color: record.configured && record.stock === 0 ? '#ff4d4f' : '' }">{{ record.stock }}</span>
				</template>
				<template slot="minOrderQty" slot-scope="text, record">{{ record.configured ? record.minOrderQty : '-' }}</template>
				<template slot="maxOrderQty" slot-scope="text, record">{{ record.configured ? (record.maxOrderQty || '不限制') : '-' }}</template>
				<template slot="onSale" slot-scope="text, record">
					<a-tag :color="record.onSale ? 'green' : ''">{{ record.onSale ? '上架中' : (record.configured ? '已下架' : '未设置') }}</a-tag>
				</template>
				<template slot="action" slot-scope="text, record">
					<div class="row-actions" style="justify-content: flex-end;">
						<a-button v-can="'price.edit'" type="link" size="small" @click="openEdit(record)">编辑</a-button>
						<a-button v-can="'price.edit'" type="link" size="small" @click="openTiers(record)">阶梯价</a-button>
					</div>
					<div class="row-actions" style="justify-content: flex-end;">
						<a-button v-can="'price.edit'" type="link" size="small" @click="openStock(record)">调整库存</a-button>
						<a-button type="link" size="small" @click="openStockLogs(record)">库存记录</a-button>
					</div>
				</template>
			</a-table>
		</a-card>

		<!-- 编辑价格库存：列表是只读的，点「编辑」在这里改价格、会员价、起订量、最大购买数量和上下架 -->
		<a-modal v-model="editVisible" :width="520" :maskClosable="false" :destroyOnClose="true" :okText="'保存'" cancelText="取消" :confirmLoading="!!(editRow && editRow.saving)" @ok="saveEdit" @cancel="closeEdit">
			<template slot="title">编辑价格库存 <span v-if="editRow" class="muted" style="font-weight: normal; margin-left: 8px;">{{ editRow.name }}</span></template>
			<a-form v-if="editRow" :label-col="{ span: 7 }" :wrapper-col="{ span: 16 }">
				<a-form-item label="价格（元）">
					<a-input-number v-model="editRow.edit.price" :min="0" :max="LIMITS.priceMax" :precision="2" :step="0.1" style="width: 100%;" />
				</a-form-item>
				<a-form-item>
					<span slot="label">会员价（元） <a-tooltip title="必须低于普通价；清空 = 没有会员价（同时清掉会员阶梯价）。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
					<a-input-number v-model="editRow.edit.memberPrice" :min="0" :max="LIMITS.priceMax" :precision="2" :step="0.1" placeholder="无" style="width: 100%;" />
				</a-form-item>
				<a-form-item label="起订量">
					<a-input-number v-model="editRow.edit.minOrderQty" :min="1" :max="LIMITS.minOrderMax" :precision="0" style="width: 100%;" />
				</a-form-item>
				<a-form-item>
					<span slot="label">最大购买数量 <a-tooltip title="指一个订单里这个产品最多买几件；清空 = 不限制。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
					<a-input-number v-model="editRow.edit.maxOrderQty" :min="1" :max="LIMITS.qtyMax" :precision="0" placeholder="不限制" style="width: 100%;" />
				</a-form-item>
				<a-form-item label="上架">
					<a-switch v-model="editRow.edit.onSale" />
				</a-form-item>
			</a-form>
		</a-modal>

		<!-- 产品详情：点列表里的产品名打开（只看，不在这里改；价格库存在列表里改）。左边是基本信息、价格库存和资料文件，右边是参数 -->
		<a-modal v-model="pdVisible" :footer="null" :width="960" :destroyOnClose="true" :bodyStyle="{ maxHeight: '72vh', overflowY: 'auto' }">
			<template slot="title">
				<span v-if="pdRow" class="copy-cell" title="点击复制" @click="copyName(pdRow.name)">{{ pdRow.name }}</span><span v-else>产品详情</span>
			</template>
			<a-spin :spinning="pdLoading">
				<div v-if="pdRow" class="pd">
					<div class="pd-cols">
						<!-- 左：基本信息、价格库存、资料文件 -->
						<div class="pd-col">
							<div class="pd-title">基本信息</div>
							<div class="pd-grid">
								<div class="pd-k">产品 ID</div><div class="pd-v">{{ pdRow.productId }}</div>
								<div class="pd-k">产品名称</div><div class="pd-v"><span class="copy-cell" title="点击复制" @click="copyName(pdRow.name)">{{ pdRow.name }}</span></div>
								<div class="pd-k">所属分类</div><div class="pd-v">{{ pdRow.catalog && pdRow.catalog.category ? pdRow.catalog.category.name : '-' }}</div>
								<div class="pd-k">所属目录</div><div class="pd-v">{{ pdRow.catalog ? pdRow.catalog.name : '-' }}</div>
								<div class="pd-k">创建时间</div><div class="pd-v">{{ (pd && pd.createdAt) || '-' }}</div>
								<div class="pd-k">修改时间</div><div class="pd-v">{{ (pd && pd.updatedAt) || '-' }}</div>
							</div>

							<div class="pd-title">价格库存（商城）</div>
							<div class="pd-grid">
								<div class="pd-k">状态</div>
								<div class="pd-v">
									<a-tag :color="pdRow.onSale ? 'green' : ''">{{ pdRow.onSale ? '上架中' : (pdRow.configured ? '已下架' : '还没设置价格') }}</a-tag>
									<a-tag v-if="pdRow.belowMin" color="red">低于全局最低价</a-tag>
								</div>
								<div class="pd-k">价格</div><div class="pd-v">{{ pdRow.configured ? '¥' + Number(pdRow.price).toFixed(2) : '-' }}</div>
								<div class="pd-k">会员价</div><div class="pd-v">{{ pdRow.configured && pdRow.memberPrice ? '¥' + Number(pdRow.memberPrice).toFixed(2) : '无' }}</div>
								<div class="pd-k">阶梯价</div><div class="pd-v">{{ pdRow.tiers && pdRow.tiers.length ? pdRow.tiers.map((t) => t.minQty + ' 件起 ¥' + Number(t.price).toFixed(2)).join('；') : '无' }}</div>
								<div class="pd-k">会员阶梯价</div><div class="pd-v">{{ pdRow.memberTiers && pdRow.memberTiers.length ? pdRow.memberTiers.map((t) => t.minQty + ' 件起 ¥' + Number(t.price).toFixed(2)).join('；') : '无' }}</div>
								<div class="pd-k">库存</div><div class="pd-v">{{ pdRow.configured ? (pdRow.stockUnlimited ? '不限' : pdRow.stock) : '-' }}</div>
								<div class="pd-k">起订量</div><div class="pd-v">{{ pdRow.configured ? pdRow.minOrderQty : '-' }}</div>
								<div class="pd-k">最大购买数量</div><div class="pd-v">{{ pdRow.configured ? (pdRow.maxOrderQty || '不限制') : '-' }}</div>
							</div>

							<div class="pd-title">资料文件（PDF）</div>
							<div v-if="pd" class="pd-grid">
								<div class="pd-k">中文版</div>
								<div class="pd-v"><a v-if="pd.fileID" @click="openPdf(pd.fileID)">查看 / 下载</a><span v-else class="pd-empty">未上传</span></div>
								<div class="pd-k">英文版</div>
								<div class="pd-v"><a v-if="pd.fileIDEn" @click="openPdf(pd.fileIDEn)">查看 / 下载</a><span v-else class="pd-empty">未上传</span></div>
							</div>
							<div v-else class="pd-empty">{{ pdFailed ? '' : '加载中…' }}</div>
						</div>
						<!-- 右：产品参数 -->
						<div class="pd-col">
							<div class="pd-title">产品参数</div>
							<div v-if="pdFailed" class="pd-empty">详情加载失败 <a @click="loadDetail">重试</a></div>
							<div v-else-if="!pdParams.length" class="pd-empty">{{ pd ? '这个目录没有设置参数' : '加载中…' }}</div>
							<div v-else class="pd-grid">
								<template v-for="p in pdParams">
									<div :key="p.id + 'k'" class="pd-k">{{ p.title }}</div>
									<div :key="p.id + 'v'" class="pd-v">{{ p.value || '-' }}</div>
								</template>
							</div>
						</div>

					</div>
					<div class="pd-foot">
						<span class="muted">产品的名称、参数、PDF 在「产品详情」页修改；价格、库存、起订量、上下架在这个列表里改。</span>
						<a-button v-can="'product.edit'" type="primary" size="small" icon="export" @click="goProductPage">去产品详情页修改</a-button>
					</div>
				</div>
			</a-spin>
		</a-modal>

		<!-- 调整库存（单个产品） -->
		<a-modal v-model="stockVisible" :title="'调整库存：' + (stockRow && stockRow.name)" :confirmLoading="stockSaving" okText="确定" cancelText="取消" @ok="saveStock">
			<p>当前库存：<b>{{ stockRow && stockRow.stockUnlimited ? '不限' : stockRow && stockRow.stock }}</b></p>
			<div class="stock-reason-title">调整方式
				<a-tooltip>
					<div slot="title">
						<p style="margin: 0 0 6px;">入库、减少：在当前库存上加减，日常入库和盘点建议用这两个。</p>
						<p style="margin: 0 0 6px;">直接设为：覆盖当前库存，这期间有客户下单被扣掉的库存会被冲掉。</p>
						<p style="margin: 0 0 6px;">不限库存：下单不检查也不扣库存，也没有库存预警；想改回限量，选「直接设为」填个数字。</p>
						<p style="margin: 0;">现在是不限库存的产品不能增减，要填数字请选「直接设为」。</p>
					</div>
					<a-icon type="question-circle" class="help-icon" />
				</a-tooltip>
			</div>
			<a-radio-group v-model="stockMode" style="margin-bottom: 12px;">
				<a-tooltip title="在当前库存基础上添加数量">
					<a-radio value="add" :disabled="stockRow && stockRow.stockUnlimited">入库（增加）</a-radio>
				</a-tooltip>
				<a-tooltip title="在当前库存基础上减去数量">
					<a-radio value="sub" :disabled="stockRow && stockRow.stockUnlimited">减少</a-radio>
				</a-tooltip>
				<a-radio value="set">直接设为</a-radio>
				<a-radio value="unlimited">不限库存</a-radio>
			</a-radio-group>
			<div v-if="stockMode !== 'unlimited'"><a-input-number v-model="stockValue" :min="0" :max="LIMITS.stockMax" :precision="0" style="width: 200px;" /></div>
			<div class="stock-reason">
				<div class="stock-reason-title">修改原因 <a-tooltip title="必填，会记进库存记录，库存对不上时靠它追查。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></div>
				<div class="quick-reasons">
					<span v-for="q in STOCK_REASONS" :key="q" class="quick-chip" :class="{ on: stockReason === q }" @click="stockReason = q">{{ q }}</span>
				</div>
				<a-input v-model="stockReason" :maxLength="100" placeholder="选一个常用的，或自己写" />
			</div>
		</a-modal>

		<!-- 库存记录：某个产品每一次库存变化（下单扣减、取消回补、后台调整）：谁、什么时候、改前改后、原因 -->
		<a-modal v-model="slVisible" :title="'库存记录：' + (slRow && slRow.name)" :footer="null" :width="1100" :destroyOnClose="true">
			<a-table :columns="slColumns" :dataSource="slList" :loading="slLoading" rowKey="id" size="small" :pagination="slPagination" @change="slChange">
				<template slot="slChange" slot-scope="text, r">
					<span v-if="r.unlimited" class="muted">改成不限库存</span>
					<span v-else-if="r.delta === null" class="muted">改成限量，库存 {{ r.after }}</span>
					<span v-else :class="r.delta > 0 ? 'sl-up' : 'sl-down'">{{ r.delta > 0 ? '+' : '' }}{{ r.delta }}</span>
					<span v-if="!r.unlimited && r.delta !== null" class="muted">（{{ r.before }} → {{ r.after }}）</span>
				</template>
				<template slot="slReason" slot-scope="text, r">
					<span>{{ r.reason || '-' }}</span>
					<a-tag v-if="r.source" style="margin-left: 6px;">{{ SL_SOURCE[r.source] || r.source }}</a-tag>
				</template>
			</a-table>
		</a-modal>

		<!-- 阶梯价：买得越多单价越低。买不到第一档的数量按起步价（普通客户是列表里的「价格」，会员是「会员价」）。点确定立即保存（和价格那一行的「保存」是分开的） -->
		<a-modal v-model="tierVisible" :confirmLoading="tierSaving" okText="确定" cancelText="取消" :width="820" @ok="saveTiers">
			<template slot="title">阶梯价：{{ tierRow && tierRow.name }}
				<a-tooltip placement="bottomLeft" :overlayStyle="{ maxWidth: '380px' }">
					<div slot="title">
						<p style="margin: 0 0 6px;">数量一档比一档大（最小 2），单价一档比一档低，第一档要低于起步价；不能低于全局最低价。</p>
						<p style="margin: 0 0 6px;">会员买的时候，会员价格和普通客户的阶梯在每个数量上取更低的，会员永远不会比普通客户贵。</p>
						<p style="margin: 0;">清空所有档就是取消阶梯价。</p>
					</div>
					<a-icon type="question-circle" class="help-icon" />
				</a-tooltip>
			</template>
			<div v-for="b in tierBlocks" :key="b.key" class="tier-card">
				<div class="tier-block-head">
					<div class="tier-block-title">{{ b.title }} <span class="tier-start">起步价 ¥{{ b.start }}</span></div>
					<span v-if="b.enabled && b.member" class="tier-follow">
						跟随普通阶梯价
						<a-switch size="small" :checked="memberFollow" @change="onFollowChange" />
					</span>
					<a-button v-if="b.enabled && !(b.member && b.follow) && b.list.length < 5" type="link" size="small" icon="plus" @click="addTier(b.list)">添加一档</a-button>
					<span v-else-if="b.enabled && !(b.member && b.follow)" class="muted">最多 5 档</span>
				</div>
				<div v-if="b.enabled" class="tier-body">
					<!-- 左：填写 -->
					<div class="tier-edit">
						<div v-if="b.member && b.follow" class="tier-empty">会员买的数量达到普通阶梯价的档位时，按普通阶梯价；不到档位按会员价。要给会员单独定阶梯价，关掉上面的开关。</div>
						<div v-else-if="!b.list.length" class="tier-empty">还没有阶梯价，买多少都按起步价</div>
						<div v-for="(t, i) in (b.member && b.follow ? [] : b.list)" :key="b.key + i" class="tier-row">
							<a-input-number v-model="t.minQty" :min="2" :max="LIMITS.qtyMax" :precision="0" style="width: 90px;" />
							<span class="tier-label">件起 每件</span>
							<a-input-number v-model="t.price" :min="0" :max="LIMITS.priceMax" :precision="2" :step="0.1" style="width: 100px;" />
							<span class="tier-label">元</span>
							<a class="act-danger tier-del" @click="b.list.splice(i, 1)">删除</a>
						</div>
					</div>
					<!-- 右：客户实际看到的价格 -->
					<div class="tier-preview">
						<div class="tier-preview-title">{{ b.previewTitle }}</div>
						<div v-for="line in b.preview" :key="line.k" class="tp-line"><span class="tp-range">{{ line.range }}</span><span class="tp-price">{{ line.price }}<small> / 件</small></span></div>
						<div v-if="!b.preview.length" class="tier-empty">没有阶梯价，按起步价卖</div>
					</div>
				</div>
				<div v-else class="tier-empty">没有设置会员价。要给会员单独的阶梯价，先在「编辑」里填会员价并保存。</div>
			</div>
		</a-modal>

		<!-- 有改了没保存的价格库存时，离开页面、翻页、换筛选条件、打开批量设置前先问一下 -->
		<a-modal v-model="leaveVisible" title="有修改还没保存" :closable="false" :maskClosable="false" :keyboard="false" :width="460">
			<p>有 <b>{{ leaveCount }}</b> 个产品的价格、会员价、起订量或上下架改了，还没有保存。要保存吗？</p>
			<p class="muted">不保存的话，这些修改会丢掉。</p>
			<template slot="footer">
				<a-button :disabled="leaveSaving" @click="leaveChoose('stay')">留在这里</a-button>
				<a-button :disabled="leaveSaving" @click="leaveChoose('discard')">不保存</a-button>
				<a-button type="primary" :loading="leaveSaving" @click="leaveChoose('save')">保存并继续</a-button>
			</template>
		</a-modal>

		<!-- 批量设置（弹窗，三步：选范围和内容 → 预览影响范围 → 完成） -->
		<a-modal v-model="batchVisible" :title="step === 'done' ? '部分产品被跳过' : '批量设置'" :width="720" :maskClosable="false" :destroyOnClose="true">
			<!-- 第 1 步：范围和内容 -->
			<template v-if="step === 'form'">
				<div class="bt-section">
					<div class="bt-title">应用范围</div>
					<a-radio-group v-model="scope" class="bt-scope">
						<a-radio value="selected">表格里勾选的产品（已选 {{ selectedKeys.length }} 个）</a-radio>
						<a-radio value="filter">当前筛选条件下的全部产品（共 {{ pagination.total }} 个）</a-radio>
					</a-radio-group>
				</div>
				<div class="bt-section">
					<div class="bt-title">修改内容 <span class="bt-sub">勾选要改的项，没勾选的不会改动</span></div>
					<!-- 没勾选的行只占一行（名字 + 一句话说明），勾选了才展开具体设置；按「价格 / 阶梯价 / 库存与上架」分三组 -->
					<div class="bt-group">价格</div>
					<div class="bt-grid">
						<div class="bt-row">
							<a-checkbox v-model="b.priceOn" class="bt-check">统一价格</a-checkbox>
							<div v-if="b.priceOn" class="bt-ctrl">
								<a-input-number v-model="b.price" :min="0" :max="LIMITS.priceMax" :precision="2" :step="0.1" style="width: 130px;" />
								<span class="bt-unit">元</span>
							</div>
							<span v-else class="bt-off">把这些产品改成同一个普通价</span>
						</div>
						<div class="bt-row">
							<a-checkbox v-model="b.memberOn" class="bt-check">会员价</a-checkbox>
							<div v-if="b.memberOn" class="bt-ctrl">
								<a-radio-group v-model="b.memberMode" size="small">
									<a-radio value="discount">按普通价打折</a-radio>
									<a-radio value="set">统一设为</a-radio>
									<a-radio value="clear">清除</a-radio>
								</a-radio-group>
								<template v-if="b.memberMode === 'discount'">
									<a-input-number v-model="b.memberDiscount" :min="0.01" :max="9.99" :precision="2" :step="0.1" style="width: 100px;" />
									<span class="bt-unit">折</span>
								</template>
								<template v-if="b.memberMode === 'set'">
									<a-input-number v-model="b.memberPrice" :min="0" :max="LIMITS.priceMax" :precision="2" :step="0.1" style="width: 120px;" />
									<span class="bt-unit">元</span>
								</template>
								<div class="bt-hint">{{ { discount: '每个产品按自己的普通价算，例：9 折，12.50 元 → 11.25 元；预览里能看到算出来的价格。', set: '要低于普通价，价格不低于它的产品会被跳过。', clear: '清除后这些产品没有会员价，会员也按普通价买。' }[b.memberMode] }}</div>
							</div>
							<span v-else class="bt-off">按普通价打折、统一设一个价，或清除</span>
						</div>
					</div>

					<div class="bt-group">阶梯价</div>
					<div class="bt-grid">
						<div v-for="blk in tierBlocks" :key="blk.key" class="bt-row">
							<a-checkbox v-model="b[blk.key + 'On']" class="bt-check">{{ blk.label }}</a-checkbox>
							<div v-if="b[blk.key + 'On']" class="bt-ctrl">
								<div class="bt-tier-top">
									<a-radio-group v-model="b[blk.key + 'Mode']" size="small">
										<a-radio value="discount">按折扣</a-radio>
										<a-radio value="fixed">统一单价</a-radio>
										<a-radio value="clear">清除</a-radio>
									</a-radio-group>
									<a-button v-if="b[blk.key + 'Mode'] !== 'clear' && b[blk.key + 'Rows'].length < 5" type="dashed" size="small" icon="plus" @click="b[blk.key + 'Rows'].push({ minQty: ((b[blk.key + 'Rows'][b[blk.key + 'Rows'].length - 1] || {}).minQty || 0) + 10, value: null })">添加一档</a-button>
								</div>
								<template v-if="b[blk.key + 'Mode'] !== 'clear'">
									<div v-for="(row, i) in b[blk.key + 'Rows']" :key="i" class="tier-row">
										<span class="tier-label">买满</span>
										<a-input-number v-model="row.minQty" :min="2" :max="LIMITS.qtyMax" :precision="0" style="width: 90px;" />
										<span class="tier-label">件起，{{ b[blk.key + 'Mode'] === 'discount' ? '打' : '每件' }}</span>
										<a-input-number v-model="row.value" :min="b[blk.key + 'Mode'] === 'discount' ? 0.01 : 0" :max="b[blk.key + 'Mode'] === 'discount' ? 9.99 : LIMITS.priceMax" :precision="2" :step="b[blk.key + 'Mode'] === 'discount' ? 0.1 : 0.5" style="width: 90px;" />
										<span class="tier-label">{{ b[blk.key + 'Mode'] === 'discount' ? '折' : '元' }}</span>
										<a v-if="b[blk.key + 'Rows'].length > 1" class="act-danger" @click="b[blk.key + 'Rows'].splice(i, 1)">删除</a>
									</div>
								</template>
								<div class="bt-hint">{{ b[blk.key + 'Mode'] === 'clear' ? '清除后这些产品没有' + blk.label + '。' : (b[blk.key + 'Mode'] === 'discount' ? '每个产品按自己的' + (blk.key === 'tier' ? '普通价' : '会员价') + '算，没有的会被跳过；' : '所有产品同一个单价，比产品价格还高的会被跳过；') + '数量一档比一档大，价格一档比一档低。' }}</div>
							</div>
							<span v-else class="bt-off">{{ blk.key === 'tier' ? '买得越多越便宜' : '会员自己的一套阶梯（需要先有会员价）' }}</span>
						</div>
					</div>

					<div class="bt-group">库存与上架</div>
					<div class="bt-grid">
						<div class="bt-row">
							<a-checkbox v-model="b.stockOn" class="bt-check">库存</a-checkbox>
							<div v-if="b.stockOn" class="bt-ctrl">
								<a-radio-group v-model="b.stockMode" size="small">
									<a-radio value="unlimited">不限库存</a-radio>
									<a-radio value="set">统一设为</a-radio>
									<a-radio value="add">增加</a-radio>
									<a-radio value="sub">减少</a-radio>
								</a-radio-group>
								<a-input-number v-if="b.stockMode !== 'unlimited'" v-model="b.stock" :min="0" :max="LIMITS.stockMax" :precision="0" style="width: 120px;" />
							</div>
							<span v-else class="bt-off">不限库存、统一设为、增加或减少（要填原因）</span>
						</div>
						<div class="bt-row">
							<a-checkbox v-model="b.minQtyOn" class="bt-check">起订量</a-checkbox>
							<div v-if="b.minQtyOn" class="bt-ctrl">
								<a-input-number v-model="b.minQty" :min="1" :max="LIMITS.minOrderMax" :precision="0" style="width: 130px;" />
								<span class="bt-unit">件起订</span>
							</div>
							<span v-else class="bt-off">统一的最少购买数量</span>
						</div>
						<div class="bt-row">
							<a-checkbox v-model="b.maxQtyOn" class="bt-check">最大购买数量</a-checkbox>
							<div v-if="b.maxQtyOn" class="bt-ctrl">
								<a-radio-group v-model="b.maxMode" size="small">
									<a-radio value="set">限制为</a-radio>
									<a-radio value="clear">不限制</a-radio>
								</a-radio-group>
								<a-input-number v-if="b.maxMode === 'set'" v-model="b.maxQty" :min="1" :max="LIMITS.qtyMax" :precision="0" style="width: 130px;" />
								<span v-if="b.maxMode === 'set'" class="bt-unit">件（每单最多）</span>
							</div>
							<span v-else class="bt-off">每个订单里这个产品最多买几件</span>
						</div>
						<div class="bt-row">
							<a-checkbox v-model="b.saleOn" class="bt-check">上下架</a-checkbox>
							<div v-if="b.saleOn" class="bt-ctrl">
								<a-radio-group v-model="b.sale" size="small">
									<a-radio :value="true">上架</a-radio>
									<a-radio :value="false">下架</a-radio>
								</a-radio-group>
							</div>
							<span v-else class="bt-off">一键上架或下架</span>
						</div>
					</div>
				</div>
				<div v-if="b.stockOn" class="bt-section">
					<div class="bt-title">库存修改原因 <span class="bt-sub">必填，每个产品的库存记录里都会写上</span></div>
					<div class="quick-reasons">
						<span v-for="q in STOCK_REASONS" :key="q" class="quick-chip" :class="{ on: b.reason === q }" @click="b.reason = q">{{ q }}</span>
					</div>
					<a-input v-model="b.reason" :maxLength="100" placeholder="选一个常用的，或自己写" />
				</div>
				<div class="bt-foot">下一步会先预览会影响多少个产品，确认后才真正修改。</div>
			</template>

			<!-- 第 2 步：预览影响范围 -->
			<template v-else-if="step === 'confirm'">
				<p>将对 <b>{{ confirm.matched }}</b> 个产品做下面的修改：</p>
				<ul class="desc"><li v-for="(d, i) in confirm.desc" :key="i">{{ d }}</li></ul>
				<div v-if="confirm.memberSamples && confirm.memberSamples.length" class="member-preview">
					<div class="muted" style="margin-bottom: 4px;">算出来的会员价（前 {{ confirm.memberSamples.length }} 个）：</div>
					<div v-for="(m, i) in confirm.memberSamples" :key="i" class="member-line">{{ m.name }}：¥{{ m.price.toFixed(2) }} → <b>¥{{ m.memberPrice.toFixed(2) }}</b></div>
				</div>
				<div v-if="confirm.tierSamples && confirm.tierSamples.length" class="member-preview">
					<div class="muted" style="margin-bottom: 4px;">算出来的阶梯价（前 {{ confirm.tierSamples.length }} 个）：</div>
					<div v-for="(m, i) in confirm.tierSamples" :key="i" class="member-line">
						{{ m.name }}：<span v-if="m.tiers.length">{{ m.tiers.map((t) => t.minQty + ' 件起 ¥' + t.price.toFixed(2)).join('，') }}</span>
						<span v-if="m.memberTiers.length">　会员：{{ m.memberTiers.map((t) => t.minQty + ' 件起 ¥' + t.price.toFixed(2)).join('，') }}</span>
					</div>
				</div>
				<p v-if="confirm.sample.length" class="muted">例如：{{ confirm.sample.join('、') }}{{ confirm.matched > confirm.sample.length ? ' 等' : '' }}</p>
				<p v-if="confirm.skippedCount > 0" class="warn">其中 {{ confirm.skippedCount }} 个产品不符合条件，会被跳过（不修改）：</p>
				<div v-for="(s, i) in confirm.skipped.slice(0, 8)" :key="i" class="skip">{{ s.name || '#' + s.productId }}：{{ s.reason }}</div>
				<div v-if="confirm.skippedCount > 8" class="muted">还有 {{ confirm.skippedCount - 8 }} 个…</div>
			</template>

			<!-- 第 3 步：结果 -->
			<template v-else>
				<template v-if="confirm.skippedCount > 0">
					<p>已修改 {{ confirm.updated }} 个，跳过了 {{ confirm.skippedCount }} 个（不符合条件）：</p>
					<div v-for="(s, i) in confirm.skipped" :key="i" class="skip">{{ s.name || '#' + s.productId }}：{{ s.reason }}</div>
				</template>
			</template>

			<template slot="footer">
				<template v-if="step === 'form'">
					<a-button @click="batchVisible = false">取消</a-button>
					<a-button type="primary" :loading="previewing" @click="next">下一步：预览影响范围</a-button>
				</template>
				<template v-else-if="step === 'confirm'">
					<a-button @click="step = 'form'">上一步</a-button>
					<a-button type="primary" :loading="applying" @click="doApply">确认修改</a-button>
				</template>
				<template v-else>
					<a-button type="primary" @click="batchVisible = false">知道了</a-button>
				</template>
			</template>
		</a-modal>

		<!-- 导入结果 -->
		<!-- 导入：先预览（改哪些、改前改后），点「确认导入」才保存；有错的行整批不保存，列出每一行的问题 -->
		<a-modal v-model="importVisible" :title="importPending ? '确认导入' : '导入表格'" :footer="importPending ? undefined : null" :width="760" :maskClosable="false" okText="确认导入" cancelText="取消" :confirmLoading="importing" @ok="confirmImport" @cancel="importPending = null">
			<template v-if="importPending">
				<p>表格共 <b>{{ importPending.total }}</b> 行：<b>{{ importPending.changedCount }}</b> 个产品会被修改<span v-if="importPending.unchangedCount">，{{ importPending.unchangedCount }} 个和现在一样（不会动）</span><span v-if="importPending.newCount">，其中 {{ importPending.newCount }} 个是第一次设置价格</span>。</p>
				<div v-if="importPending.summary.length" class="import-summary"><a-tag v-for="x in importPending.summary" :key="x" color="blue">{{ x }}</a-tag></div>
				<div v-if="importPending.preview.length" class="import-preview">
					<div class="muted" style="margin-bottom: 6px;">改动明细{{ importPending.changedCount > importPending.preview.length ? '（只列前 ' + importPending.preview.length + ' 个）' : '' }}：</div>
					<div v-for="c in importPending.preview" :key="c.productId" class="import-line">
						<b>{{ c.name }}</b><span class="muted">（ID {{ c.productId }}）</span>
						<div v-for="(f, k) in c.fields" :key="k" class="import-change">{{ FIELD_LABEL[k] }}：<span class="import-from">{{ fieldText(k, f.from) }}</span> → <span class="import-to">{{ fieldText(k, f.to) }}</span></div>
					</div>
				</div>
				<div v-if="importPending.needsReason" class="stock-reason">
					<div class="stock-reason-title">库存修改原因 <span class="muted">（这次导入改了库存，必填，每个产品的库存记录里都会写上）</span></div>
					<div class="quick-reasons">
						<span v-for="q in STOCK_REASONS" :key="q" class="quick-chip" :class="{ on: importReason === q }" @click="importReason = q">{{ q }}</span>
					</div>
					<a-input v-model="importReason" :maxLength="100" placeholder="选一个常用的，或自己写" />
				</div>
				<a-alert type="warning" show-icon message="确认后会立即保存，影响商城里的价格和库存。" style="margin-top: 12px;" />
			</template>
			<template v-else-if="importResult">
				<a-alert v-if="importResult.ok" type="success" show-icon :message="'已保存 ' + importResult.saved + ' 行'" />
				<template v-else>
					<a-alert type="error" show-icon message="没有保存任何数据，请修正下面的问题后重新导入" style="margin-bottom: 12px;" />
					<div v-for="(e, i) in importResult.errors" :key="i" style="color: #ff4d4f;">{{ e }}</div>
				</template>
			</template>
		</a-modal>
	</div>
</template>

<script>
import { notifyError } from '@/utils/notify'
import { copyToClipboard } from '@/utils/copy'
import { isMainUser, can } from '@/utils/auth'
import { getProductSales, getStockLogs, updateProductSale, bulkProductSales, batchProductSales, getShopSettings, updateShopSettings, getCategories, getCatalogs, getProductById, getPdfDownloadUrl } from '@/api'
import { toCsv, parseCsv, parseTierText, tierText } from '@/utils/shop'
import { LIMITS, PRICE_TEXT } from '@/utils/shopLimits'

// 会员价：没有（null、undefined、空、0）统一看成 null，才好比较有没有改
const memberOf = (v) => (v === null || v === undefined || v === '' || Number(v) === 0 ? null : Number(v))
const withEdit = (r) => ({ ...r, saving: false, edit: { price: r.price, memberPrice: r.memberPrice, minOrderQty: r.minOrderQty, maxOrderQty: r.maxOrderQty || null, onSale: r.onSale } })
// 阶梯价弹窗用：只留填完整的档（数量、单价都是合法数字），按数量排好
const cleanRows = (rows) => rows.filter((t) => Number.isInteger(t.minQty) && t.minQty >= 2 && t.price > 0).map((t) => ({ minQty: t.minQty, price: Number(t.price) })).sort((a, b) => a.minQty - b.minQty)
const scheduleAt = (base, tiers, qty) => tiers.reduce((best, t) => (qty >= t.minQty && t.price < best ? t.price : best), base)
// 预览文字：base 起步价、tiers 这套阶梯；normalBase/normalTiers 是普通客户那套（会员预览要和它取更低；普通预览传同一套即可）
function previewLines(base, tiers, normalBase, normalTiers) {
  const isMember = base !== normalBase || normalTiers.length > 0
  const priceAt = (q) => (isMember ? Math.min(scheduleAt(base, tiers, q), scheduleAt(normalBase, normalTiers, q)) : scheduleAt(base, tiers, q))
  const points = [...new Set([...tiers, ...normalTiers].map((t) => t.minQty))].sort((a, b) => a - b)
  if (!tiers.length && !normalTiers.length) return []
  const steps = [{ minQty: 1, price: priceAt(1) }]
  points.forEach((q) => { const p = priceAt(q); if (p < steps[steps.length - 1].price) steps.push({ minQty: q, price: p }) })
  return steps.map((st, i) => {
    const next = steps[i + 1]
    const range = next ? (next.minQty - 1 > st.minQty ? `${st.minQty} ~ ${next.minQty - 1} 件` : `${st.minQty} 件`) : `${st.minQty} 件及以上`
    return { k: i, range, price: '¥' + st.price.toFixed(2), text: `${range}：¥${st.price.toFixed(2)} / 件` }
  })
}
// 导出的表头就是导入的表头。导入时按表头文字开头匹配列，列的顺序可以换
const HEADERS = ['产品ID', '产品名称', '价格(元)', '会员价(元，空=不改，填「无」=清除)', '阶梯价(空=不改，填「无」=清除，例：10件起8元;100件起6元)', '会员阶梯价(空=不改，填「无」=清除，写法同阶梯价)', '库存', '起订量', '最大购买数量(空=不改，填「无」=不限制)', '是否上架(是/否)']

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
	data() {
		return {
			LIMITS,
			main: isMainUser(),
			canEdit: can('price.edit'), // 只有查看权限时，表格里的价格、库存等是只读的
			// 全局最低价
			min: { enabled: false, price: 0, saved: { enabled: false, price: 0 }, saving: false },
			belowMinCount: 0,
			// 筛选
			categories: [],
			catalogs: [],
			categoryId: undefined,
			catalogId: undefined,
			keyword: '',
			// 从「产品详情」页跳过来时要高亮的产品 ID
			focusId: null,
			filter: '',
			loading: false,
			exporting: false,
			importing: false,
			rows: [],
			leaveVisible: false,
			leaveSaving: false,
			leaveCount: 0,
			applied: { categoryId: undefined, catalogId: undefined, keyword: '', filter: '' },
			pagination: newPagination(),
			selectedKeys: [],
			// 批量设置
			scope: 'selected',
			b: { priceOn: false, price: 0, memberOn: false, memberMode: 'discount', memberDiscount: null, memberPrice: 0, tierOn: false, tierMode: 'discount', tierRows: [{ minQty: 10, value: null }], mtierOn: false, mtierMode: 'discount', mtierRows: [{ minQty: 10, value: null }], reason: '', stockOn: false, stockMode: 'unlimited', stock: 0, minQtyOn: false, minQty: 1, maxQtyOn: false, maxMode: 'set', maxQty: null, saleOn: false, sale: true },
			previewing: false,
			applying: false,
			batchVisible: false,
			step: 'form', // form 选范围和内容 / confirm 预览影响范围 / done 完成
			confirm: { matched: 0, desc: [], sample: [], skipped: [], skippedCount: 0, updated: 0, payload: null },
			columns: [
				{ title: '产品', dataIndex: 'name', key: 'name', scopedSlots: { customRender: 'name' } },
				{ title: '价格（元）', key: 'price', scopedSlots: { customRender: 'price' } },
				{ title: '会员价（元）', key: 'memberPrice', scopedSlots: { customRender: 'memberPrice' } },
				{ title: '阶梯价', key: 'tiers', scopedSlots: { customRender: 'tiers' } },
				{ title: '库存', key: 'stock', scopedSlots: { customRender: 'stock' } },
				{ title: '起订量', key: 'minOrderQty', scopedSlots: { customRender: 'minOrderQty' } },
				{ title: '最大购买数量', key: 'maxOrderQty', scopedSlots: { customRender: 'maxOrderQty' } },
				{ title: '上架', key: 'onSale', scopedSlots: { customRender: 'onSale' } },
				{ title: '操作', key: 'action', width: 170, align: 'right', scopedSlots: { customRender: 'action' } }
			],
			// 产品详情弹窗
			editVisible: false,
			memberFollow: true,
			editRow: null,
			pdVisible: false,
			pdLoading: false,
			pdFailed: false,
			pdRow: null, // 列表里的这一行（价格库存信息）
			pd: null, // 产品本身的详情（参数、PDF）
			tierVisible: false,
			tierSaving: false,
			tierRow: null,
			tierList: [],
			memberTierList: [],
			stockVisible: false,
			stockSaving: false,
			stockRow: null,
			stockMode: 'add',
			stockValue: 0,
			stockReason: '',
			STOCK_REASONS: ['采购入库', '年底盘点', '退货入库', '损耗', '样品出库', '录入错误更正'],
			SL_SOURCE: { single: '单个调整', batch: '批量设置', import: '表格导入' },
			slVisible: false,
			slLoading: false,
			slRow: null,
			slList: [],
			slPagination: { current: 1, pageSize: 20, total: 0, showTotal: (t) => `共 ${t} 条` },
			slColumns: [
				{ title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
				{ title: '类型', dataIndex: 'typeText', key: 'typeText', width: 100 },
				{ title: '变化', key: 'change', scopedSlots: { customRender: 'slChange' }, width: 170 },
				{ title: '原因', key: 'reason', scopedSlots: { customRender: 'slReason' } },
				{ title: '订单', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
				{ title: '操作人', dataIndex: 'actor', key: 'actor', width: 80 }
			],
			importVisible: false,
			importResult: null,
			importReason: '',
			importPending: null, // 预览通过、等用户确认的导入：{ items, total, changedCount, … }
			FIELD_LABEL: { price: '价格', memberPrice: '会员价', tiers: '阶梯价', memberTiers: '会员阶梯价', stock: '库存', minOrderQty: '起订量', maxOrderQty: '最大购买数量', onSale: '上架' }
		}
	},
	computed: {
		tierBlocks() {
			return [{ key: 'tier', label: '阶梯价' }, { key: 'mtier', label: '会员阶梯价' }]
		},
		// 阶梯价弹窗里的预览：按现在填的内容实时算。普通客户：起步价 + 普通阶梯；会员：会员价 + 会员阶梯，和普通那套每个数量上取更低
		// 阶梯价弹窗里的两块：普通客户、会员（没有会员价的产品，会员那块只显示说明）
		tierBlocks() {
			const r = this.tierRow
			if (!r) return []
			return [
				{ key: 'n', title: '普通客户', start: Number(r.price).toFixed(2), enabled: true, list: this.tierList, preview: this.tierPreview, previewTitle: '普通客户看到的价格' },
				{ key: 'm', title: '会员', start: r.memberPrice ? Number(r.memberPrice).toFixed(2) : '-', enabled: !!r.memberPrice, member: true, follow: this.memberFollow, list: this.memberTierList, preview: this.memberTierPreview, previewTitle: '会员看到的价格' }
			]
		},
		tierPreview() {
			const r = this.tierRow
			return r ? previewLines(r.price, cleanRows(this.tierList), r.price, []) : []
		},
		memberTierPreview() {
			const r = this.tierRow
			return r && r.memberPrice ? previewLines(r.memberPrice, this.memberFollow ? [] : cleanRows(this.memberTierList), r.price, cleanRows(this.tierList)) : []
		},
		// 参数：按目录里的参数标题顺序，配上这个产品填的值
		pdParams() {
			const titles = (this.pd && this.pd.catalog && this.pd.catalog.paramTitles) || []
			const values = (this.pd && this.pd.parameters) || {}
			return titles.map((t) => (typeof t === 'string' ? { id: t, title: t, value: values[t] } : { id: t.id, title: t.title, value: values[t.id] }))
		},
		minDirty() {
			return this.min.enabled !== this.min.saved.enabled || Number(this.min.price) !== Number(this.min.saved.price)
		},
		// 目录下拉：选了分类就只显示这个分类下的目录
		catalogOptions() {
			return this.categoryId ? this.catalogs.filter((c) => c.categoryId === this.categoryId) : this.catalogs
		},
		rowSelection() {
			return {
				selectedRowKeys: this.selectedKeys,
				onChange: (keys) => { this.selectedKeys = keys }
			}
		}
	},
	watch: {
		// 已经在这个页面时点了右上角的库存通知：按通知里的产品名重新搜
		'$route.query'(q, old) {
			if (!q.keyword || (q.keyword === old.keyword && q.n === old.n)) return
			this.keyword = String(q.keyword)
			this.catalogId = undefined
			this.focusId = null
			this.handleSearch()
		}
	},
	// 离开这个页面（点了别的菜单）时，有没保存的修改先问
	beforeRouteLeave(to, from, next) {
		this.askLeave().then((go) => next(go ? undefined : false))
	},
	beforeDestroy() {
		window.removeEventListener('beforeunload', this.onUnload)
	},
	created() {
		window.addEventListener('beforeunload', this.onUnload)
		// 从「产品详情」页跳过来：?keyword=产品名&catalogId=目录ID&focus=产品ID
		const q = this.$route.query || {}
		if (q.keyword) this.keyword = String(q.keyword)
		if (q.catalogId && !isNaN(Number(q.catalogId))) this.catalogId = Number(q.catalogId)
		if (q.focus && !isNaN(Number(q.focus))) this.focusId = Number(q.focus)
		this.loadSettings()
		this.loadCategories()
		this.fetch()
	},
	methods: {
		async copyName(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制：' + text)
			else this.$message.warning('复制失败，请手动复制')
		},
		// ---------- 没保存的修改 ----------
		dirtyRows() {
			return this.rows.filter((r) => this.dirty(r))
		},
		// 关闭或刷新浏览器标签页时，有没保存的修改就让浏览器提示一下（文字由浏览器决定）
		onUnload(e) {
			if (this.dirtyRows().length) {
				e.preventDefault()
				e.returnValue = ''
			}
		},
		// 有没保存的修改就弹窗问：保存并继续 / 不保存 / 留在这里。返回 true 表示可以继续
		askLeave() {
			const n = this.dirtyRows().length
			if (!n) return Promise.resolve(true)
			this.leaveCount = n
			this.leaveVisible = true
			return new Promise((resolve) => { this.leaveResolve = resolve })
		},
		async leaveChoose(choice) {
			let go = choice !== 'stay'
			if (choice === 'save') {
				this.leaveSaving = true
				for (const r of this.dirtyRows()) await this.save(r)
				this.leaveSaving = false
				if (this.dirtyRows().length) go = false // 有的没保存成功（比如价格填得不对），留下来让用户改
			}
			this.leaveVisible = false
			const resolve = this.leaveResolve
			this.leaveResolve = null
			if (resolve) resolve(go)
		},
		dirty(r) {
			return r.edit.price !== r.price || memberOf(r.edit.memberPrice) !== memberOf(r.memberPrice) || r.edit.minOrderQty !== r.minOrderQty || (r.edit.maxOrderQty || null) !== (r.maxOrderQty || null) || r.edit.onSale !== r.onSale
		},
		// ---------- 全局最低价 ----------
		applySettings(d) {
			this.min = { enabled: d.minPrice.enabled, price: d.minPrice.price, saved: { enabled: d.minPrice.enabled, price: d.minPrice.price }, saving: false }
			this.belowMinCount = d.belowMinCount
		},
		async loadSettings() {
			try {
				this.applySettings(await getShopSettings())
			} catch (error) {
				notifyError(this, error, '获取全局最低价设置失败')
			}
		},
		async saveMin() {
			if (this.min.enabled && !(Number(this.min.price) >= LIMITS.priceMin && Number(this.min.price) <= LIMITS.priceMax)) return this.$message.warning('开启全局最低价时，' + PRICE_TEXT)
			try {
				this.min.saving = true
				const d = await updateShopSettings({ minPrice: { enabled: this.min.enabled, price: String(this.min.price || 0) } })
				this.applySettings(d)
				this.$message.success(this.min.enabled ? '已开启全局最低价' : '已关闭全局最低价')
				this.fetch()
			} catch (error) {
				this.min.saving = false
				notifyError(this, error, '保存失败')
			}
		},
		showBelowMin() {
			this.categoryId = undefined
			this.catalogId = undefined
			this.keyword = ''
			this.filter = 'belowMin'
			this.handleSearch()
		},
		// ---------- 筛选与列表 ----------
		async loadCategories() {
			try {
				const [cats, cals] = await Promise.all([getCategories(), getCatalogs()])
				this.categories = cats
				this.catalogs = cals
			} catch (error) {
				notifyError(this, error, '获取分类和目录失败')
			}
		},
		onCategoryChange() {
			this.catalogId = undefined // 换了分类，原来选的目录不一定还属于它
			this.handleSearch()
		},
		// 没让换（留在这里）：把筛选框恢复成当前列表实际用的条件，免得框里和列表对不上
		restoreQuery() {
			Object.assign(this, this.applied)
		},
		query() {
			return { categoryId: this.categoryId, catalogId: this.catalogId, keyword: this.keyword.trim(), filter: this.filter }
		},
		async fetch() {
			this.applied = this.query()
			try {
				this.loading = true
				const data = await getProductSales({ ...this.query(), page: this.pagination.current, pageSize: this.pagination.pageSize })
				this.rows = data.list.map(withEdit)
				this.pagination.total = data.total
			} catch (error) {
				notifyError(this, error, '获取产品列表失败')
			} finally {
				this.loading = false
			}
		},
		async handleSearch() {
			if (!(await this.askLeave())) return this.restoreQuery()
			this.pagination.current = 1
			this.fetch()
		},
		// 重置：清空分类、目录、关键词，状态回到「全部产品」，回到第一页重新查
		handleReset() {
			this.categoryId = undefined
			this.catalogId = undefined
			this.keyword = ''
			this.filter = ''
			this.handleSearch()
		},
		async handleTableChange(p) {
			if (!(await this.askLeave())) return
			applyTableChange(this.pagination, p)
			this.fetch()
		},
		openEdit(r) {
			r.edit = { price: r.price, memberPrice: r.memberPrice, minOrderQty: r.minOrderQty, maxOrderQty: r.maxOrderQty || null, onSale: r.onSale }
			this.editRow = r
			this.editVisible = true
		},
		// 取消：丢掉改动（不然离开页面时会被当成「有没保存的修改」）
		closeEdit() {
			const r = this.editRow
			if (r) r.edit = { price: r.price, memberPrice: r.memberPrice, minOrderQty: r.minOrderQty, maxOrderQty: r.maxOrderQty || null, onSale: r.onSale }
			this.editVisible = false
		},
		async saveEdit() {
			const r = this.editRow
			if (!r) return
			if (!this.dirty(r)) { this.editVisible = false; return }
			await this.save(r)
			if (!this.dirty(r)) this.editVisible = false // 保存成功才关；校验没过或服务端拒绝时留在弹窗里改
		},
		async save(r) {
			const e = r.edit
			if (e.price === null || e.price === undefined) return this.$message.warning('请填写价格')
			if (e.price !== r.price && !(e.price >= LIMITS.priceMin && e.price <= LIMITS.priceMax)) return this.$message.warning(PRICE_TEXT)
			if (e.onSale && !(e.price > 0)) return this.$message.warning('没有设置价格的产品不能上架')
			const mp = memberOf(e.memberPrice)
			if (mp !== null) {
				if (!(mp >= LIMITS.priceMin && mp <= LIMITS.priceMax)) return this.$message.warning('会员' + PRICE_TEXT)
				if (!(mp < e.price)) return this.$message.warning('会员价必须低于普通价')
			}
			try {
				r.saving = true
				// 只提交改过的字段（库存不在这里改：库存由下单扣减，直接覆盖会冲掉）
				const body = {}
				if (e.price !== r.price) body.price = String(e.price)
				if (memberOf(e.memberPrice) !== memberOf(r.memberPrice)) body.memberPrice = mp === null ? null : String(mp)
				if (e.minOrderQty !== r.minOrderQty) body.minOrderQty = e.minOrderQty
				if ((e.maxOrderQty || null) !== (r.maxOrderQty || null)) body.maxOrderQty = e.maxOrderQty || null // 清空 = 不限制
				if (e.onSale !== r.onSale) body.onSale = e.onSale
				const res = await updateProductSale(r.productId, body)
				Object.assign(r, { price: res.price, memberPrice: res.memberPrice, minOrderQty: res.minOrderQty, maxOrderQty: res.maxOrderQty || null, onSale: res.onSale, stock: res.stock, stockUnlimited: res.stockUnlimited, configured: true })
				r.edit = { price: r.price, memberPrice: r.memberPrice, minOrderQty: r.minOrderQty, maxOrderQty: r.maxOrderQty || null, onSale: r.onSale }
				this.$message.success('已保存')
				this.loadSettings() // 改价可能让「低于最低价」的数量变化
			} catch (error) {
				notifyError(this, error, '保存失败')
			} finally {
				r.saving = false
			}
		},
		// ---------- 批量设置 ----------
		// 范围：勾选的产品，或当前筛选条件下的全部产品（服务端按同样的条件查，不受分页影响）
		target() {
			if (this.scope === 'selected') {
				if (!this.selectedKeys.length) { this.$message.warning('请先在下面的表格里勾选产品，或者把应用范围改成「当前筛选条件下的全部产品」'); return null }
				return { productIds: this.selectedKeys }
			}
			if (!this.pagination.total) { this.$message.warning('当前筛选条件下没有产品'); return null }
			return { query: this.query() }
		},
		formSet() {
			const b = this.b
			const set = {}
			const desc = []
			if (b.priceOn) {
				// 价格 0 在系统里表示「没有定价」，批量设成 0 会把一批产品的价格清空，所以必须大于 0（要清掉某个产品的价格请在表格里单个改）
				if (!(b.price >= LIMITS.priceMin && b.price <= LIMITS.priceMax)) { this.$message.warning('统一' + PRICE_TEXT); return null }
				set.price = String(b.price)
				desc.push(`价格统一改为 ¥${Number(b.price).toFixed(2)}`)
			}
			if (b.memberOn) {
				if (b.memberMode === 'clear') { set.memberPrice = null; desc.push('清除会员价') }
				else if (b.memberMode === 'discount') {
					const d = Number(b.memberDiscount)
					if (!(d >= 0.01 && d <= 9.99)) { this.$message.warning('折扣要在 0.01 到 9.99 折之间'); return null }
					set.memberDiscount = Math.round(d * 100) / 100
					desc.push(`会员价 = 各产品普通价 × ${set.memberDiscount} 折（自动算好，保留两位小数）`)
				} else {
					if (!(b.memberPrice >= LIMITS.priceMin && b.memberPrice <= LIMITS.priceMax)) { this.$message.warning('统一会员' + PRICE_TEXT); return null }
					set.memberPrice = String(b.memberPrice)
					desc.push(`会员价统一改为 ¥${Number(b.memberPrice).toFixed(2)}`)
				}
			}
			// 阶梯价、会员阶梯价：清除 / 按折扣（每个产品按自己的价格算）/ 统一单价
			for (const blk of this.tierBlocks) {
				if (!b[blk.key + 'On']) continue
				const mode = b[blk.key + 'Mode']
				const field = blk.key === 'tier' ? 'tiers' : 'memberTiers'
				if (mode === 'clear') { set[field] = []; desc.push(`清除${blk.label}`); continue }
				const rows = b[blk.key + 'Rows']
				const problem = this.batchTierProblem(rows, mode, blk.label)
				if (problem) { this.$message.warning(problem); return null }
				if (mode === 'discount') {
					set[blk.key === 'tier' ? 'tierDiscounts' : 'memberTierDiscounts'] = rows.map((r) => ({ minQty: r.minQty, discount: Math.round(r.value * 100) / 100 }))
					desc.push(`${blk.label}（按折扣）：` + rows.map((r) => `${r.minQty} 件起 ${r.value} 折`).join('，') + '（每个产品按自己的' + (blk.key === 'tier' ? '普通价' : '会员价') + '算）')
				} else {
					set[field] = rows.map((r) => ({ minQty: r.minQty, price: String(r.value) }))
					desc.push(`${blk.label}统一为：` + rows.map((r) => `${r.minQty} 件起 ¥${Number(r.value).toFixed(2)}`).join('，'))
				}
			}
			if (b.stockOn && b.stockMode === 'unlimited') {
				set.stockUnlimited = true
				desc.push('库存统一设为「不限」（下单不检查也不扣库存）')
			} else if (b.stockOn) {
				if (b.stock === null || b.stock === undefined) { this.$message.warning('请填写库存数量'); return null }
				if (b.stockMode !== 'set' && !(b.stock > 0)) { this.$message.warning('库存增加或减少的数量要大于 0'); return null }
				if (b.stockMode === 'set') { set.stock = b.stock; desc.push(`库存统一设为 ${b.stock}（会覆盖当前库存）`) }
				else { set.stockDelta = b.stockMode === 'add' ? b.stock : -b.stock; desc.push(`库存${b.stockMode === 'add' ? '增加' : '减少'} ${b.stock}`) }
			}
			if (b.minQtyOn) {
				if (!b.minQty) { this.$message.warning('请填写起订量'); return null }
				set.minOrderQty = b.minQty
				desc.push(`起订量改为 ${b.minQty}`)
			}
			if (b.maxQtyOn) {
				if (b.maxMode === 'clear') { set.maxOrderQty = null; desc.push('最大购买数量改为不限制') }
				else {
					if (!b.maxQty) { this.$message.warning('请填写最大购买数量'); return null }
					set.maxOrderQty = b.maxQty
					desc.push(`最大购买数量限制为 ${b.maxQty} 件`)
				}
			}
			if (b.saleOn) { set.onSale = b.sale; desc.push(b.sale ? '上架' : '下架') }
			if (!desc.length) { this.$message.warning('请勾选要修改的内容'); return null }
			// 改库存必须写原因（服务端也会检查）
			let reason = ''
			if (b.stockOn) {
				reason = String(b.reason || '').trim()
				if (!reason) { this.$message.warning('请填写库存修改原因'); return null }
				desc.push('库存修改原因：' + reason)
			}
			return { set, desc, reason }
		},
		// 批量里的阶梯行检查（服务端会再检查一遍）
		batchTierProblem(rows, mode, label) {
			let prevQty = 1
			let prevV = Infinity
			for (let i = 0; i < rows.length; i++) {
				const r = rows[i]
				const n = i + 1
				if (!Number.isInteger(r.minQty) || r.minQty < 2) return `${label}第 ${n} 档的数量要填不小于 2 的整数`
				if (mode === 'discount') {
					if (!(r.value >= 0.01 && r.value <= 9.99)) return `${label}第 ${n} 档的折扣要在 0.01 到 9.99 折之间`
				} else if (!(r.value >= LIMITS.priceMin && r.value <= LIMITS.priceMax)) return `${label}第 ${n} 档的` + PRICE_TEXT
				if (r.minQty <= prevQty) return `${label}的数量要一档比一档大`
				if (r.value >= prevV) return `${label}的${mode === 'discount' ? '折扣' : '单价'}要一档比一档低`
				prevQty = r.minQty
				prevV = r.value
			}
			return ''
		},
		// 打开批量设置弹窗。preset：'on' / 'off' 是「一键上架/下架」，只预选「上下架」，范围还是要在弹窗里确认
		async openBatch(preset) {
			if (!(await this.askLeave())) return // 批量设置完会重新加载列表，没保存的修改会丢，先问
			this.b = { priceOn: false, price: 0, memberOn: false, memberMode: 'discount', memberDiscount: null, memberPrice: 0, tierOn: false, tierMode: 'discount', tierRows: [{ minQty: 10, value: null }], mtierOn: false, mtierMode: 'discount', mtierRows: [{ minQty: 10, value: null }], reason: '', stockOn: false, stockMode: 'unlimited', stock: 0, minQtyOn: false, minQty: 1, maxQtyOn: false, maxMode: 'set', maxQty: null, saleOn: false, sale: true }
			if (preset) { this.b.saleOn = true; this.b.sale = preset === 'on' }
			this.scope = this.selectedKeys.length ? 'selected' : 'filter' // 勾选了产品就默认对勾选的操作，没勾选就默认对当前筛选结果
			this.step = 'form'
			this.batchVisible = true
		},
		// 下一步：先让服务端预览会影响多少个、哪些会被跳过，用户确认后才真正修改
		async next() {
			const f = this.formSet()
			if (!f) return
			const target = this.target()
			if (!target) return
			try {
				this.previewing = true
				const r = await batchProductSales({ ...target, set: f.set, ...(f.reason ? { reason: f.reason } : {}), dryRun: true })
				this.confirm = { matched: r.matched, desc: f.desc, sample: r.sample, memberSamples: r.memberSamples || [], tierSamples: r.tierSamples || [], skipped: r.skipped, skippedCount: r.skippedCount, updated: 0, payload: { ...target, set: f.set, ...(f.reason ? { reason: f.reason } : {}) } }
				this.step = 'confirm'
			} catch (error) {
				notifyError(this, error, '批量设置失败')
			} finally {
				this.previewing = false
			}
		},
		async doApply() {
			try {
				this.applying = true
				const r = await batchProductSales(this.confirm.payload)
				this.confirm = { ...this.confirm, updated: r.updated, skipped: r.skipped, skippedCount: r.skippedCount }
				// 修改成功用消息提示；只有有产品被跳过时才留下弹窗，列出被跳过的原因
				this.$message.success(`已修改 ${r.updated} 个产品` + (r.skippedCount > 0 ? `，跳过 ${r.skippedCount} 个` : ''))
				if (r.skippedCount > 0) this.step = 'done'
				else this.batchVisible = false
				if (this.scope === 'selected') this.selectedKeys = []
				this.fetch()
				this.loadSettings()
			} catch (error) {
				notifyError(this, error, '批量设置失败')
			} finally {
				this.applying = false
			}
		},
		// ---------- 产品详情 ----------
		openDetail(record) {
			this.pdRow = record
			this.pd = null
			this.pdVisible = true
			this.loadDetail()
		},
		async loadDetail() {
			const id = this.pdRow && this.pdRow.productId
			if (!id) return
			try {
				this.pdLoading = true
				this.pdFailed = false
				const data = await getProductById(id)
				if (this.pdRow && this.pdRow.productId === id) this.pd = data
			} catch (error) {
				this.pdFailed = true
				notifyError(this, error, '获取产品详情失败')
			} finally {
				this.pdLoading = false
			}
		},
		// 跳到「产品详情」页并定位到这个产品：重名产品很多，带上目录一起筛选，再高亮这一行
		goProductPage() {
			const r = this.pdRow
			if (!r) return
			const catalogId = (r.catalog && r.catalog.id) || r.catalogId
			const query = { name: r.name, focus: String(r.productId) }
			if (catalogId) query.catalogId = String(catalogId)
			this.pdVisible = false
			this.$router.push({ path: '/products', query })
		},
		// PDF 是云存储文件，取一个临时链接再打开。先开一个空白窗口再改地址，避免异步请求后被浏览器当成弹窗拦截
		async openPdf(fileID) {
			const win = window.open('', '_blank')
			try {
				const res = await getPdfDownloadUrl(fileID)
				const url = res && res.file_list && res.file_list[0] && res.file_list[0].download_url
				if (!url) throw new Error('没有取到文件链接')
				if (win) win.location.href = url
			} catch (error) {
				if (win) win.close()
				notifyError(this, error, '打开文件失败')
			}
		},
		// ---------- 单个产品设置阶梯价 ----------
		openTiers(r) {
			if (!r.configured || !(r.price > 0)) return this.$message.warning('请先给这个产品设置价格（在价格那一列填好并保存）')
			this.tierRow = r
			this.tierList = (r.tiers || []).map((t) => ({ minQty: t.minQty, price: Number(t.price) }))
			this.memberTierList = (r.memberTiers || []).map((t) => ({ minQty: t.minQty, price: Number(t.price) }))
			if (!this.tierList.length) this.addTier(this.tierList)
			// 会员没有自己的阶梯价 = 跟随普通阶梯价（默认）；关掉「跟随」才能自定义
			this.memberFollow = !this.memberTierList.length
			this.tierVisible = true
		},
		onFollowChange(v) {
			this.memberFollow = v
			if (!v && !this.memberTierList.length) this.addTier(this.memberTierList) // 打开自定义时先给一档空的
		},
		addTier(list) {
			const last = list[list.length - 1]
			list.push({ minQty: last ? (last.minQty || 0) + 10 : 10, price: null })
		},
		// 提交前的检查（服务端会再检查一遍）。返回错误提示，没问题返回 ''
		tierProblem(list, base, label) {
			let prevQty = 1
			let prevPrice = base
			for (let i = 0; i < list.length; i++) {
				const t = list[i]
				const n = i + 1
				if (!Number.isInteger(t.minQty) || t.minQty < 2) return `${label}第 ${n} 档的数量要填不小于 2 的整数`
				if (!(t.price >= LIMITS.priceMin && t.price <= LIMITS.priceMax)) return `${label}第 ${n} 档的` + PRICE_TEXT
				if (t.minQty <= prevQty) return `${label}的数量要一档比一档大`
				if (t.price >= prevPrice) return n === 1 ? `${label}第 1 档的单价要低于起步价 ¥${Number(base).toFixed(2)}` : `${label}的单价要一档比一档低`
				prevQty = t.minQty
				prevPrice = t.price
			}
			return ''
		},
		async saveTiers() {
			const r = this.tierRow
			const blank = (t) => t.minQty == null && t.price == null // 完全空的一档当作没填
			const list = this.tierList.filter((t) => !blank(t))
			const mlist = r.memberPrice ? (this.memberFollow ? [] : this.memberTierList.filter((t) => !blank(t))) : null
			const problem = this.tierProblem(list, r.price, '阶梯价') || (mlist ? this.tierProblem(mlist, r.memberPrice, '会员阶梯价') : '')
			if (problem) return this.$message.warning(problem)
			const toBody = (rows) => rows.map((t) => ({ minQty: t.minQty, price: String(t.price) }))
			try {
				this.tierSaving = true
				const res = await updateProductSale(r.productId, { tiers: toBody(list), ...(mlist ? { memberTiers: toBody(mlist) } : {}) })
				r.tiers = res.tiers || []
				r.memberTiers = res.memberTiers || []
				this.tierVisible = false
				this.$message.success(r.tiers.length || r.memberTiers.length ? '阶梯价已保存' : '已取消阶梯价')
			} catch (error) {
				notifyError(this, error, '保存阶梯价失败')
			} finally {
				this.tierSaving = false
			}
		},
		// ---------- 库存记录 ----------
		openStockLogs(r) {
			this.slRow = r
			this.slPagination = { ...this.slPagination, current: 1, total: 0 }
			this.slList = []
			this.slVisible = true
			this.loadStockLogs()
		},
		async loadStockLogs() {
			try {
				this.slLoading = true
				const res = await getStockLogs(this.slRow.productId, { page: this.slPagination.current, pageSize: this.slPagination.pageSize })
				this.slList = res.list || []
				this.slPagination = { ...this.slPagination, total: res.total || 0 }
			} catch (error) {
				notifyError(this, error, '获取库存记录失败')
			} finally {
				this.slLoading = false
			}
		},
		slChange(p) {
			this.slPagination = { ...this.slPagination, current: p.current, pageSize: p.pageSize }
			this.loadStockLogs()
		},
		// ---------- 单个产品调整库存 ----------
		openStock(r) {
			this.stockRow = r
			// 没设置过的产品默认选「不限库存」；已经是不限的，改数字用「直接设为」；限量的默认「入库」
			this.stockMode = !r.configured ? 'unlimited' : r.stockUnlimited ? 'set' : 'add'
			this.stockValue = 0
			this.stockReason = ''
			this.stockVisible = true
		},
		async saveStock() {
			const r = this.stockRow
			const n = this.stockValue
			const unlimited = this.stockMode === 'unlimited'
			if (!unlimited) {
				if (n === null || n === undefined || !Number.isInteger(n) || n < 0) return this.$message.warning('请填写库存数量')
				if (this.stockMode !== 'set' && n === 0) return this.$message.warning('数量要大于 0')
			}
			const reason = String(this.stockReason || '').trim()
			if (!reason) return this.$message.warning('请填写修改原因（选一个常用的或自己写）')
			const body = { ...(unlimited ? { stockUnlimited: true } : this.stockMode === 'set' ? { stock: n } : { stockDelta: this.stockMode === 'add' ? n : -n }), reason }
			try {
				this.stockSaving = true
				const res = await updateProductSale(r.productId, body)
				r.stock = res.stock
				r.stockUnlimited = res.stockUnlimited
				r.configured = true
				this.stockVisible = false
				this.$message.success('库存已更新')
			} catch (error) {
				notifyError(this, error, '调整库存失败')
			} finally {
				this.stockSaving = false
			}
		},
		// ---------- CSV 导出 / 导入 ----------
		// 导出当前筛选条件下的全部产品（一页 100 条循环取完），用来在 Excel 里批量改价格再导入
		async exportCsv() {
			try {
				this.exporting = true
				const out = [HEADERS]
				for (let page = 1; ; page++) {
					const data = await getProductSales({ ...this.query(), page, pageSize: 100 })
					data.list.forEach((r) => out.push([r.productId, r.name, r.configured ? r.price : '', r.configured ? (r.memberPrice || '') : '', r.configured ? tierText(r.tiers) : '', r.configured ? tierText(r.memberTiers) : '', r.configured ? (r.stockUnlimited ? '不限' : r.stock) : '', r.configured ? r.minOrderQty : '', r.configured ? (r.maxOrderQty || '') : '', r.configured ? (r.onSale ? '是' : '否') : '']))
					if (page * 100 >= data.total || !data.list.length) break
				}
				const blob = new Blob([toCsv(out)], { type: 'text/csv;charset=utf-8' })
				const a = document.createElement('a')
				a.href = URL.createObjectURL(blob)
				a.download = '产品价格库存.csv'
				a.click()
				URL.revokeObjectURL(a.href)
			} catch (error) {
				notifyError(this, error, '导出失败')
			} finally {
				this.exporting = false
			}
		},
		// 导入：按「产品ID」匹配；空的单元格不改；先在页面里检查格式，服务端再校验一遍，有错就一行都不保存
		onFile(e) {
			const file = e.target.files[0]
			e.target.value = ''
			if (!file) return
			if (file.size > 2 * 1024 * 1024) return this.$message.error('文件太大（最多 2MB）')
			if (/\.xlsx?$/i.test(file.name)) return this.$message.error('只支持 CSV 文件，请在 Excel 里另存为 CSV（UTF-8）')
			const reader = new FileReader()
			reader.onerror = () => this.$message.error('读取文件失败')
			reader.onload = () => this.importRows(parseCsv(String(reader.result)))
			reader.readAsText(file, 'utf-8')
		},
		// rows：表格的每一行（CSV 读出来是 [[单元格文字, ...], ...]）
		async importRows(rows) {
			const fail = (errors) => { this.importResult = { ok: false, errors }; this.importVisible = true }
			if (rows.length < 2) return fail(['表格里没有数据'])
			const head = rows[0].map((h) => h.trim())
			const col = (name) => head.findIndex((h) => h.startsWith(name))
			const idx = { id: col('产品ID'), price: col('价格'), member: col('会员价'), tier: col('阶梯价'), mtier: col('会员阶梯价'), stock: col('库存'), min: col('起订量'), max: col('最大购买数量'), sale: col('是否上架') }
			if (idx.id < 0) return fail(['第一行必须有「产品ID」列（建议先用「导出表格」得到模板）'])
			if (rows.length - 1 > 1000) return fail(['一次最多导入 1000 行，请分批导入'])
			const errors = []
			const items = []
			rows.slice(1).forEach((r, i) => {
				const line = i + 2
				const cell = (k) => (idx[k] >= 0 && r[idx[k]] !== undefined ? r[idx[k]].trim() : '')
				const item = { productId: Number(cell('id')) }
				if (!Number.isInteger(item.productId) || item.productId <= 0) return errors.push(`第 ${line} 行：产品ID 不对`)
				if (cell('price') !== '') item.price = cell('price')
				if (cell('member') === '无') item.memberPrice = null
				else if (cell('member') !== '') item.memberPrice = cell('member')
				// 阶梯价、会员阶梯价：空 = 不改，「无」= 清除，其它按「10件起8元;100件起6元」解析
				for (const [key, field, label] of [['tier', 'tiers', '阶梯价'], ['mtier', 'memberTiers', '会员阶梯价']]) {
					const v = cell(key)
					if (v === '') continue
					if (v === '无') { item[field] = null; continue }
					const t = parseTierText(v)
					if (t.error) return errors.push(`第 ${line} 行：${label}${t.error}`)
					item[field] = t.tiers
				}
				if (cell('stock') === '不限') item.stockUnlimited = true
				else if (cell('stock') !== '') item.stock = Number(cell('stock'))
				if (cell('min') !== '') item.minOrderQty = Number(cell('min'))
				if (cell('max') === '无') item.maxOrderQty = null // 填「无」= 不限制；空 = 不改
				else if (cell('max') !== '') item.maxOrderQty = Number(cell('max'))
				if (cell('sale') !== '') {
					if (!['是', '否'].includes(cell('sale'))) return errors.push(`第 ${line} 行：是否上架只能填「是」或「否」`)
					item.onSale = cell('sale') === '是'
				}
				items.push({ line, item })
			})
			if (errors.length) return fail(errors)
			if (!items.length) return fail(['表格里没有数据'])
			// 先让服务端检查并预览（不写入），页面上给用户确认后才真正保存
			try {
				this.importing = true
				const res = await bulkProductSales(items.map((x) => x.item), true)
				const names = { price: '价格', memberPrice: '会员价', tiers: '阶梯价', memberTiers: '会员阶梯价', stock: '库存', minOrderQty: '起订量', maxOrderQty: '最大购买数量', onSale: '上下架' }
				const summary = Object.keys(res.fieldCounts || {}).map((k) => `${names[k] || k} ${res.fieldCounts[k]} 个`)
				if (!res.changedCount) return fail(['表格里的内容和现在完全一样，没有需要修改的'])
				this.importReason = ''
				this.importPending = { needsReason: !!res.needsReason, items: items.map((x) => x.item), lines: items.map((x) => x.line), total: res.total, changedCount: res.changedCount, unchangedCount: res.unchangedCount, newCount: res.newCount, summary, preview: res.preview || [] }
				this.importResult = null
				this.importVisible = true
			} catch (error) {
				// 服务端校验没通过：把它指出的行号翻译成表格里的行号
				const list = (error.errors || []).map((x) => `第 ${items[x.index] ? items[x.index].line : x.index + 2} 行：${x.message}`)
				if (list.length) fail(list)
				else notifyError(this, error, '导入失败')
			} finally {
				this.importing = false
			}
		},
		// 预览里的值怎么显示
		fieldText(key, v) {
			if (v === null || v === undefined || v === '') return key === 'memberPrice' ? '无' : key === 'maxOrderQty' ? '不限制' : '（空）'
			if (key === 'tiers' || key === 'memberTiers') return v.length ? v.map((t) => `${t.minQty}件起¥${Number(t.price).toFixed(2)}`).join('；') : '无'
			if (key === 'price' || key === 'memberPrice') return '¥' + Number(v).toFixed(2)
			if (key === 'onSale') return v ? '上架' : '下架'
			return String(v)
		},
		// 用户确认后才真正保存（用刚才预览的同一份数据）
		async confirmImport() {
			const pending = this.importPending
			if (!pending) return
			const reason = String(this.importReason || '').trim()
			if (pending.needsReason && !reason) return this.$message.warning('请填写库存修改原因')
			try {
				this.importing = true
				const res = await bulkProductSales(pending.items, false, pending.needsReason ? reason : '')
				this.importPending = null
				this.importResult = { ok: true, saved: res.saved }
				this.fetch()
				this.loadSettings()
			} catch (error) {
				this.importPending = null
				const list = (error.errors || []).map((x) => `第 ${(pending.lines && pending.lines[x.index]) || x.index + 2} 行：${x.message}`)
				if (list.length) { this.importResult = { ok: false, errors: list } } else { this.importVisible = false; notifyError(this, error, '导入失败') }
			} finally {
				this.importing = false
			}
		}
	}
}
</script>

<style scoped>
.row-actions >>> .ant-btn { height: 24px; line-height: 24px; }
.cell-links { display: flex; gap: 12px; margin-top: 2px; white-space: nowrap; }
.help-icon { color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
.copy-cell { cursor: pointer; }
.copy-cell:hover { color: #1890ff; }
.quick-reasons { display: flex; flex-wrap: wrap; gap: 8px; }
.quick-chip { padding: 2px 12px; line-height: 24px; border: 1px solid #d9d9d9; border-radius: 14px; color: #595959; background: #fff; cursor: pointer; user-select: none; transition: all .15s; }
.quick-chip:hover { color: #1890ff; border-color: #1890ff; }
.quick-chip.on { color: #fff; background: #1890ff; border-color: #1890ff; }
.stock-reason { margin-top: 14px; }
.stock-reason-title { margin-bottom: 8px; font-weight: 600; color: #262626; }
.stock-reason .quick-reasons { margin-bottom: 8px; }
.sl-up { color: #389e0d; font-weight: 600; }
.sl-down { color: #cf1322; font-weight: 600; }
.import-summary { margin-bottom: 8px; }
.import-preview { max-height: 320px; overflow-y: auto; padding: 8px 12px; background: #fafafa; border-radius: 4px; }
.import-line { padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.import-line:last-child { border-bottom: none; }
.import-change { margin-left: 12px; font-size: 13px; line-height: 22px; }
.import-from { color: #8c8c8c; text-decoration: line-through; }
.import-to { color: #d46b08; font-weight: 600; }
.name-link { color: inherit; font-weight: 500; }
.name-link:hover { color: #1890ff; }
.pd-foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 16px; }
.pd-title { font-weight: 600; margin: 18px 0 8px; }
.pd-title:first-child { margin-top: 0; }
.pd-cols { display: flex; gap: 28px; align-items: flex-start; }
.pd-col { flex: 1; min-width: 0; }
.tier-sum { display: inline-flex; flex-direction: column; vertical-align: middle; font-size: 13px; line-height: 20px; color: #595959; cursor: default; }
.tier-card { padding: 14px 16px; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 14px; }
.tier-card:last-child { margin-bottom: 0; }
.tier-start { margin-left: 8px; font-weight: 400; font-size: 12px; color: #8c8c8c; }
.tier-empty { color: #8c8c8c; font-size: 12px; padding: 4px 0; }
.tier-del { margin-left: auto; }
.tier-follow { margin-left: auto; margin-right: 8px; font-size: 12px; color: #595959; }
.tier-follow .ant-switch { margin-left: 6px; }
.tier-row { display: flex; align-items: center; margin-bottom: 10px; }
.bt-tier-top { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.tier-label { margin: 0 8px; color: #595959; white-space: nowrap; }
.tier-member { color: #d46b08; }
.tier-block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.tier-block-title { font-weight: 600; color: #262626; }
.tier-block-title .muted { margin-left: 8px; font-weight: 400; }
.tier-body { display: flex; align-items: stretch; gap: 20px; }
.tier-edit { flex: 1 1 0; min-width: 0; }
.tier-preview { flex: 1 1 0; min-width: 0; margin: 0; padding: 0 0 0 20px; border-left: 1px dashed #d9d9d9; }
.tp-line { display: flex; justify-content: space-between; align-items: baseline; padding: 7px 0; border-bottom: 1px solid #f5f5f5; }
.tp-line:last-child { border-bottom: 0; }
.tp-range { color: #595959; font-size: 13px; }
.tp-price { color: #262626; font-weight: 600; font-size: 14px; }
.tp-price small { color: #8c8c8c; font-weight: 400; font-size: 12px; }
.tier-preview-title { color: #8c8c8c; font-size: 12px; margin-bottom: 2px; }
.pd-grid { display: grid; grid-template-columns: 110px 1fr; gap: 1px; background: #f0f0f0; border: 1px solid #f0f0f0; border-radius: 6px; overflow: hidden; }
.pd-k, .pd-v { padding: 8px 12px; }
.pd-k { background: #fafafa; color: #595959; }
.pd-v { background: #fff; word-break: break-all; }
.pd-empty { color: #bfbfbf; }
.top-card .min-row { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #f0f0f0; }
.label-inline { margin-right: 10px; color: #595959; font-weight: 500; }
.warn { color: #d46b08; }
.batch-hint { flex: 1; min-width: 0; }
.batch-bar { display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.row { display: flex; align-items: center; flex-wrap: wrap; }
.gap { margin: 0 8px; }
.muted { color: #8c8c8c; font-size: 12px; }
.label { width: 80px; flex-shrink: 0; color: #595959; }
.toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.filters { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.fields { display: flex; flex-wrap: wrap; gap: 12px 32px; }
.field { display: flex; align-items: center; }
.desc { padding-left: 20px; margin-bottom: 8px; }
.skip { color: #d46b08; font-size: 13px; padding: 2px 0; }
.unlimited { color: #1890ff; }
.stock-note { margin-top: 12px; color: #8c8c8c; font-size: 12px; line-height: 20px; }
/* 批量设置弹窗：分两块（应用范围、修改内容），修改内容每项一行、左边勾选项对齐 */
.bt-section { margin-bottom: 20px; }
.bt-title { font-weight: 600; margin-bottom: 10px; }
.bt-sub { margin-left: 8px; color: #8c8c8c; font-weight: normal; font-size: 12px; }
.bt-scope .ant-radio-wrapper { display: block; line-height: 30px; }
.bt-grid { border: 1px solid #f0f0f0; border-radius: 6px; }
.bt-row { display: flex; align-items: flex-start; padding: 11px 14px; }
.bt-row + .bt-row { border-top: 1px solid #f5f5f5; }
.bt-check { width: 128px; flex: none; margin-top: 3px; white-space: nowrap; }
.bt-group { margin: 16px 0 8px; color: #8c8c8c; font-size: 12px; letter-spacing: 1px; }
.bt-group:first-of-type { margin-top: 0; }
.bt-off { color: #bfbfbf; font-size: 12px; line-height: 28px; }
.bt-ctrl { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; flex: 1; min-width: 0; }
.bt-unit { color: #8c8c8c; }
.bt-hint { width: 100%; color: #8c8c8c; font-size: 12px; line-height: 20px; }
.member-preview { margin: 8px 0 12px; padding: 8px 12px; background: #fafafa; border-radius: 6px; }
.member-line { line-height: 24px; }
.bt-foot { color: #8c8c8c; font-size: 12px; }
</style>
