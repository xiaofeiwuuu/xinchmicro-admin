<template>
	<div>
		<!-- 筛选 + 全局最低价（紧凑的一张卡片，给下面的列表多留高度） -->
		<a-card :bordered="false" class="mb-24 top-card" :bodyStyle="{ padding: '12px 24px' }">
			<div class="toolbar">
				<div class="filters">
					<a-select v-model="categoryId" placeholder="全部分类" allowClear style="width: 140px;" @change="onCategoryChange">
						<a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
					</a-select>
					<a-select v-model="catalogId" placeholder="全部目录" allowClear style="width: 150px;" @change="handleSearch">
						<a-select-option v-for="c in catalogOptions" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
					</a-select>
					<a-input-search v-model="keyword" placeholder="搜索产品名称" style="width: 180px;" allowClear @search="handleSearch" />
					<a-select v-model="filter" style="width: 140px;" @change="handleSearch">
						<a-select-option value="">全部产品</a-select-option>
						<a-select-option value="unconfigured">还没设置价格</a-select-option>
						<a-select-option value="onSale">上架中</a-select-option>
						<a-select-option value="offSale">已下架</a-select-option>
						<a-select-option value="belowMin">低于全局最低价</a-select-option>
					</a-select>
					<a-button type="primary" @click="handleSearch"><a-icon type="search" /> 搜索</a-button>
				</div>
				<div>
					<a-button :loading="exporting" @click="exportCsv" style="margin-right: 8px;">导出（CSV）</a-button>
					<a-button :loading="importing" @click="$refs.file.click()">导入（CSV）</a-button>
					<input ref="file" type="file" accept=".csv,text/csv" style="display: none;" @change="onFile" />
				</div>
			</div>
			<!-- 全局最低价：一行 -->
			<div class="row min-row">
				<span class="label-inline">全局最低价</span>
				<a-switch v-model="min.enabled" size="small" :disabled="!main" />
				<span class="gap">{{ min.enabled ? '已开启，价格不能低于' : '未开启' }}</span>
				<a-input-number v-model="min.price" :min="0" :max="99999999" :precision="2" :step="1" :disabled="!main" size="small" style="width: 110px;" />
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
			<div class="batch-bar" style="margin-bottom: 12px;">
				<a-button type="primary" @click="openBatch()"><a-icon type="edit" /> 批量设置</a-button>
				<a-button style="margin-left: 8px;" @click="openBatch('on')">一键上架</a-button>
				<a-button type="danger" ghost style="margin-left: 8px;" @click="openBatch('off')">一键下架</a-button>
				<span class="muted gap">{{ selectedKeys.length ? '已勾选 ' + selectedKeys.length + ' 个产品' : '可以先勾选产品，也可以对当前筛选结果的全部产品操作' }}</span>
				<a v-if="selectedKeys.length" @click="selectedKeys = []">清除勾选</a>
			</div>
			<a-table :scroll="tableScroll" :rowClassName="(r) => (r.productId === focusId ? 'row-focus' : '')" rowKey="productId" :columns="columns" :dataSource="rows" :pagination="pagination" :loading="loading" :rowSelection="rowSelection" @change="handleTableChange">
				<template slot="name" slot-scope="text, record">
					<a class="name-link" @click="openDetail(record)">{{ text }}</a>
					<div style="color: #8c8c8c; font-size: 12px;">{{ record.catalog ? (record.catalog.category ? record.catalog.category.name + ' / ' : '') + record.catalog.name : '' }}</div>
				</template>
				<template slot="price" slot-scope="text, record">
					<a-input-number v-model="record.edit.price" :min="0" :max="99999999" :precision="2" :step="0.1" style="width: 120px;" />
					<div v-if="record.belowMin" style="margin-top: 4px;"><a-tag color="red">低于最低价</a-tag></div>
				</template>
				<template slot="stock" slot-scope="text, record">
					<span :style="{ color: record.configured && record.stock === 0 ? '#ff4d4f' : '' }">{{ record.stock }}</span>
					<a style="margin-left: 8px;" @click="openStock(record)">调整</a>
				</template>
				<template slot="minOrderQty" slot-scope="text, record">
					<a-input-number v-model="record.edit.minOrderQty" :min="1" :max="1000000" :precision="0" style="width: 90px;" />
				</template>
				<template slot="onSale" slot-scope="text, record">
					<a-switch v-model="record.edit.onSale" />
				</template>
				<template slot="action" slot-scope="text, record">
					<a-button type="primary" size="small" :disabled="!dirty(record)" :loading="record.saving" @click="save(record)">保存</a-button>
				</template>
			</a-table>
		</a-card>

		<!-- 产品详情：点列表里的产品名打开（只看，不在这里改；价格库存在列表里改）。左边是基本信息、价格库存和资料文件，右边是参数 -->
		<a-modal v-model="pdVisible" :title="pdRow ? pdRow.name : '产品详情'" :footer="null" :width="960" :destroyOnClose="true" :bodyStyle="{ maxHeight: '72vh', overflowY: 'auto' }">
			<a-spin :spinning="pdLoading">
				<div v-if="pdRow" class="pd">
					<div class="pd-cols">
						<!-- 左：基本信息、价格库存、资料文件 -->
						<div class="pd-col">
							<div class="pd-title">基本信息</div>
							<div class="pd-grid">
								<div class="pd-k">产品 ID</div><div class="pd-v">{{ pdRow.productId }}</div>
								<div class="pd-k">产品名称</div><div class="pd-v">{{ pdRow.name }}</div>
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
								<div class="pd-k">库存</div><div class="pd-v">{{ pdRow.configured ? pdRow.stock : '-' }}</div>
								<div class="pd-k">起订量</div><div class="pd-v">{{ pdRow.configured ? pdRow.minOrderQty : '-' }}</div>
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
						<a-button type="primary" size="small" icon="export" @click="goProductPage">去产品详情页修改</a-button>
					</div>
				</div>
			</a-spin>
		</a-modal>

		<!-- 调整库存（单个产品） -->
		<a-modal v-model="stockVisible" :title="'调整库存：' + (stockRow && stockRow.name)" :confirmLoading="stockSaving" okText="确定" cancelText="取消" @ok="saveStock">
			<p>当前库存：<b>{{ stockRow && stockRow.stock }}</b></p>
			<a-radio-group v-model="stockMode" style="margin-bottom: 12px;">
				<a-radio value="add">入库（增加）</a-radio>
				<a-radio value="sub">减少</a-radio>
				<a-radio value="set">直接设为</a-radio>
			</a-radio-group>
			<div><a-input-number v-model="stockValue" :min="0" :max="1000000000" :precision="0" style="width: 200px;" /></div>
			<a-alert v-if="stockMode === 'set'" type="warning" show-icon style="margin-top: 12px;"
				message="「直接设为」会覆盖当前库存。如果这期间有客户下单，被扣掉的库存会被冲掉；日常入库和盘点调整建议用「入库」或「减少」。" />
		</a-modal>

		<!-- 批量设置（弹窗，三步：选范围和内容 → 预览影响范围 → 完成） -->
		<a-modal v-model="batchVisible" :title="step === 'done' ? '批量设置完成' : '批量设置'" :width="720" :maskClosable="false" :destroyOnClose="true">
			<!-- 第 1 步：范围和内容 -->
			<template v-if="step === 'form'">
				<div class="row" style="margin-bottom: 16px; flex-wrap: nowrap;">
					<span class="label">应用范围</span>
					<a-radio-group v-model="scope">
						<a-radio value="selected" style="display: block; line-height: 30px;">表格里勾选的产品（已选 {{ selectedKeys.length }} 个）</a-radio>
						<a-radio value="filter" style="display: block; line-height: 30px;">当前筛选条件下的全部产品（共 {{ pagination.total }} 个）</a-radio>
					</a-radio-group>
				</div>
				<div class="row" style="align-items: flex-start; flex-wrap: nowrap;">
					<span class="label" style="padding-top: 4px;">修改内容</span>
					<div class="fields" style="flex: 1;">
						<div class="field">
							<a-checkbox v-model="b.priceOn">统一价格</a-checkbox>
							<a-input-number v-model="b.price" :disabled="!b.priceOn" :min="0" :max="99999999" :precision="2" :step="0.1" style="width: 130px; margin-left: 8px;" />
							<span class="gap">元</span>
						</div>
						<div class="field">
							<a-checkbox v-model="b.stockOn">库存</a-checkbox>
							<a-radio-group v-model="b.stockMode" :disabled="!b.stockOn" size="small" style="margin-left: 8px;">
								<a-radio value="add">增加</a-radio>
								<a-radio value="sub">减少</a-radio>
								<a-radio value="set">统一设为</a-radio>
							</a-radio-group>
							<a-input-number v-model="b.stock" :disabled="!b.stockOn" :min="0" :max="1000000000" :precision="0" style="width: 120px; margin-left: 4px;" />
						</div>
						<div class="field">
							<a-checkbox v-model="b.minQtyOn">起订量</a-checkbox>
							<a-input-number v-model="b.minQty" :disabled="!b.minQtyOn" :min="1" :max="1000000" :precision="0" style="width: 130px; margin-left: 8px;" />
						</div>
						<div class="field">
							<a-checkbox v-model="b.saleOn">上下架</a-checkbox>
							<a-radio-group v-model="b.sale" :disabled="!b.saleOn" size="small" style="margin-left: 8px;">
								<a-radio :value="true">上架</a-radio>
								<a-radio :value="false">下架</a-radio>
							</a-radio-group>
						</div>
					</div>
				</div>
				<div class="muted" style="margin-top: 16px;">没勾选的内容不会改动。下一步会先预览会影响多少个产品，确认后才真正修改。</div>
			</template>

			<!-- 第 2 步：预览影响范围 -->
			<template v-else-if="step === 'confirm'">
				<p>将对 <b>{{ confirm.matched }}</b> 个产品做下面的修改：</p>
				<ul class="desc"><li v-for="(d, i) in confirm.desc" :key="i">{{ d }}</li></ul>
				<p v-if="confirm.sample.length" class="muted">例如：{{ confirm.sample.join('、') }}{{ confirm.matched > confirm.sample.length ? ' 等' : '' }}</p>
				<a-alert v-if="confirm.skippedCount > 0" type="warning" show-icon
					:message="'其中 ' + confirm.skippedCount + ' 个产品不符合条件，会被跳过（不修改）'" />
				<div v-for="(s, i) in confirm.skipped.slice(0, 8)" :key="i" class="skip">{{ s.name || '#' + s.productId }}：{{ s.reason }}</div>
				<div v-if="confirm.skippedCount > 8" class="muted">还有 {{ confirm.skippedCount - 8 }} 个…</div>
			</template>

			<!-- 第 3 步：结果 -->
			<template v-else>
				<a-alert type="success" show-icon :message="'已修改 ' + confirm.updated + ' 个产品'" />
				<template v-if="confirm.skippedCount > 0">
					<p style="margin-top: 12px;">跳过了 {{ confirm.skippedCount }} 个（不符合条件）：</p>
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
		<a-modal v-model="importVisible" title="导入表格" :footer="null">
			<template v-if="importResult">
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
import { isMainUser } from '@/utils/auth'
import { getProductSales, updateProductSale, bulkProductSales, batchProductSales, getShopSettings, updateShopSettings, getCategories, getCatalogs, getProductById, getPdfDownloadUrl } from '@/api'
import { toCsv, parseCsv } from '@/utils/shop'

const withEdit = (r) => ({ ...r, saving: false, edit: { price: r.price, minOrderQty: r.minOrderQty, onSale: r.onSale } })
const HEADERS = ['产品ID', '产品名称', '价格(元)', '库存', '起订量', '是否上架(是/否)']

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
	data() {
		return {
			main: isMainUser(),
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
			pagination: newPagination(),
			selectedKeys: [],
			// 批量设置
			scope: 'selected',
			b: { priceOn: false, price: 0, stockOn: false, stockMode: 'add', stock: 0, minQtyOn: false, minQty: 1, saleOn: false, sale: true },
			previewing: false,
			applying: false,
			batchVisible: false,
			step: 'form', // form 选范围和内容 / confirm 预览影响范围 / done 完成
			confirm: { matched: 0, desc: [], sample: [], skipped: [], skippedCount: 0, updated: 0, payload: null },
			columns: [
				{ title: '产品', dataIndex: 'name', key: 'name', scopedSlots: { customRender: 'name' } },
				{ title: '价格（元）', key: 'price', scopedSlots: { customRender: 'price' } },
				{ title: '库存', key: 'stock', scopedSlots: { customRender: 'stock' } },
				{ title: '起订量', key: 'minOrderQty', scopedSlots: { customRender: 'minOrderQty' } },
				{ title: '上架', key: 'onSale', scopedSlots: { customRender: 'onSale' } },
				{ title: '', key: 'action', scopedSlots: { customRender: 'action' } }
			],
			// 产品详情弹窗
			pdVisible: false,
			pdLoading: false,
			pdFailed: false,
			pdRow: null, // 列表里的这一行（价格库存信息）
			pd: null, // 产品本身的详情（参数、PDF）
			stockVisible: false,
			stockSaving: false,
			stockRow: null,
			stockMode: 'add',
			stockValue: 0,
			importVisible: false,
			importResult: null
		}
	},
	computed: {
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
	created() {
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
		dirty(r) {
			return r.edit.price !== r.price || r.edit.minOrderQty !== r.minOrderQty || r.edit.onSale !== r.onSale
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
			if (this.min.enabled && !(Number(this.min.price) > 0)) return this.$message.warning('开启全局最低价时，请填写大于 0 的金额')
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
		query() {
			return { categoryId: this.categoryId, catalogId: this.catalogId, keyword: this.keyword.trim(), filter: this.filter }
		},
		async fetch() {
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
		handleSearch() {
			this.pagination.current = 1
			this.fetch()
		},
		handleTableChange(p) {
			applyTableChange(this.pagination, p)
			this.fetch()
		},
		async save(r) {
			const e = r.edit
			if (e.price === null || e.price === undefined) return this.$message.warning('请填写价格')
			if (e.onSale && !(e.price > 0)) return this.$message.warning('没有设置价格的产品不能上架')
			try {
				r.saving = true
				// 只提交改过的字段（库存不在这里改：库存由下单扣减，直接覆盖会冲掉）
				const body = {}
				if (e.price !== r.price) body.price = String(e.price)
				if (e.minOrderQty !== r.minOrderQty) body.minOrderQty = e.minOrderQty
				if (e.onSale !== r.onSale) body.onSale = e.onSale
				const res = await updateProductSale(r.productId, body)
				Object.assign(r, { price: res.price, minOrderQty: res.minOrderQty, onSale: res.onSale, stock: res.stock, configured: true })
				r.edit = { price: r.price, minOrderQty: r.minOrderQty, onSale: r.onSale }
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
				if (!(b.price > 0)) { this.$message.warning('统一价格要大于 0'); return null }
				set.price = String(b.price)
				desc.push(`价格统一改为 ¥${Number(b.price).toFixed(2)}`)
			}
			if (b.stockOn) {
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
			if (b.saleOn) { set.onSale = b.sale; desc.push(b.sale ? '上架' : '下架') }
			if (!desc.length) { this.$message.warning('请勾选要修改的内容'); return null }
			return { set, desc }
		},
		// 打开批量设置弹窗。preset：'on' / 'off' 是「一键上架/下架」，只预选「上下架」，范围还是要在弹窗里确认
		openBatch(preset) {
			this.b = { priceOn: false, price: 0, stockOn: false, stockMode: 'add', stock: 0, minQtyOn: false, minQty: 1, saleOn: false, sale: true }
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
				const r = await batchProductSales({ ...target, set: f.set, dryRun: true })
				this.confirm = { matched: r.matched, desc: f.desc, sample: r.sample, skipped: r.skipped, skippedCount: r.skippedCount, updated: 0, payload: { ...target, set: f.set } }
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
				this.step = 'done'
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
		// ---------- 单个产品调整库存 ----------
		openStock(r) {
			this.stockRow = r
			this.stockMode = 'add'
			this.stockValue = 0
			this.stockVisible = true
		},
		async saveStock() {
			const r = this.stockRow
			const n = this.stockValue
			if (n === null || n === undefined || !Number.isInteger(n) || n < 0) return this.$message.warning('请填写库存数量')
			if (this.stockMode !== 'set' && n === 0) return this.$message.warning('数量要大于 0')
			const body = this.stockMode === 'set' ? { stock: n } : { stockDelta: this.stockMode === 'add' ? n : -n }
			try {
				this.stockSaving = true
				const res = await updateProductSale(r.productId, body)
				r.stock = res.stock
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
					data.list.forEach((r) => out.push([r.productId, r.name, r.configured ? r.price : '', r.configured ? r.stock : '', r.configured ? r.minOrderQty : '', r.configured ? (r.onSale ? '是' : '否') : '']))
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
			const reader = new FileReader()
			reader.onload = () => this.importRows(String(reader.result))
			reader.onerror = () => this.$message.error('读取文件失败')
			reader.readAsText(file, 'utf-8')
		},
		async importRows(text) {
			const rows = parseCsv(text)
			const fail = (errors) => { this.importResult = { ok: false, errors }; this.importVisible = true }
			if (rows.length < 2) return fail(['表格里没有数据'])
			const head = rows[0].map((h) => h.trim())
			const col = (name) => head.findIndex((h) => h.startsWith(name))
			const idx = { id: col('产品ID'), price: col('价格'), stock: col('库存'), min: col('起订量'), sale: col('是否上架') }
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
				if (cell('stock') !== '') item.stock = Number(cell('stock'))
				if (cell('min') !== '') item.minOrderQty = Number(cell('min'))
				if (cell('sale') !== '') {
					if (!['是', '否'].includes(cell('sale'))) return errors.push(`第 ${line} 行：是否上架只能填「是」或「否」`)
					item.onSale = cell('sale') === '是'
				}
				items.push({ line, item })
			})
			if (errors.length) return fail(errors)
			if (!items.length) return fail(['表格里没有数据'])
			try {
				this.importing = true
				const res = await bulkProductSales(items.map((x) => x.item))
				this.importResult = { ok: true, saved: res.saved }
				this.importVisible = true
				this.fetch()
				this.loadSettings()
			} catch (error) {
				// 服务端校验没通过：把它指出的行号翻译成表格里的行号
				const list = (error.errors || []).map((x) => `第 ${items[x.index] ? items[x.index].line : x.index + 2} 行：${x.message}`)
				if (list.length) fail(list)
				else notifyError(this, error, '导入失败')
			} finally {
				this.importing = false
			}
		}
	}
}
</script>

<style scoped>
.name-link { color: inherit; font-weight: 500; }
.name-link:hover { color: #1890ff; }
.pd-foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 16px; }
.pd-title { font-weight: 600; margin: 18px 0 8px; }
.pd-title:first-child { margin-top: 0; }
.pd-cols { display: flex; gap: 28px; align-items: flex-start; }
.pd-col { flex: 1; min-width: 0; }
.pd-grid { display: grid; grid-template-columns: 110px 1fr; gap: 1px; background: #f0f0f0; border: 1px solid #f0f0f0; border-radius: 6px; overflow: hidden; }
.pd-k, .pd-v { padding: 8px 12px; }
.pd-k { background: #fafafa; color: #595959; }
.pd-v { background: #fff; word-break: break-all; }
.pd-empty { color: #bfbfbf; }
.top-card .min-row { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #f0f0f0; }
.label-inline { margin-right: 10px; color: #595959; font-weight: 500; }
.warn { color: #d46b08; }
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
</style>
