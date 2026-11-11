<!-- 公告管理：小程序打开时弹出，每条公告每台设备只弹一次，改了内容会再弹一次。
     「生效」= 启用 + 在显示时间段内；小程序一次最多取最新的 5 条。 -->
<template>
	<div>
		<a-card :bordered="false" class="mb-24">
			<a-button v-can="'announcement.edit'" type="primary" icon="plus" @click="openAdd">新增公告</a-button>
			<span class="hint">客户打开小程序时弹窗显示；每条公告每台设备只弹一次，修改内容后会再弹一次。</span>
		</a-card>

		<a-card :bordered="false">
			<a-table :scroll="tableScroll" rowKey="id" :columns="columns" :dataSource="list" :pagination="pagination" :loading="loading" @change="handleTableChange">
				<template slot="content" slot-scope="text">
					<a-tooltip :title="text"><span class="content-cell">{{ text }}</span></a-tooltip>
				</template>
				<template slot="phase" slot-scope="text">
					<a-tag :color="PHASE[text].color" :class="{ 'tag-off': !PHASE[text].color }">{{ PHASE[text].label }}</a-tag>
				</template>
				<template slot="period" slot-scope="text, record">
					<span v-if="!record.startAt && !record.endAt">一直显示</span>
					<span v-else>{{ fmt(record.startAt, '立即') }} ~ {{ fmt(record.endAt, '不结束') }}</span>
				</template>
				<template slot="updatedAt" slot-scope="text">{{ fmt(text, '-') }}</template>
				<template slot="action" slot-scope="text, record">
					<div class="row-actions" v-can="'announcement.edit'">
						<a @click="openEdit(record)">编辑</a>
						<a v-if="record.status === 'active'" @click="toggle(record)">停用</a>
						<a v-else @click="toggle(record)">启用</a>
						<a class="act-danger" @click="remove(record)">删除</a>
					</div>
				</template>
			</a-table>
		</a-card>

		<a-modal :title="editingId ? '编辑公告' : '新增公告'" :visible="visible" :confirmLoading="saving" :width="1000" :maskClosable="false" okText="保存" @ok="save" @cancel="visible = false">
			<a-form layout="horizontal" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
				<a-row type="flex" :gutter="0">
					<!-- 左：中文 -->
					<a-col :xs="24" :md="12" class="col-left">
						<a-form-item label="标题" required>
							<a-input v-model="form.title" :maxLength="100" placeholder="例如：春节放假通知" />
						</a-form-item>
						<a-form-item label="正文" required>
							<a-textarea v-model="form.content" :rows="6" :maxLength="2000" placeholder="公告内容，换行会保留" />
							<div class="count">{{ form.content.length }} / 2000</div>
						</a-form-item>
						<a-form-item>
							<span slot="label">显示时间 <a-tooltip title="选填；不选就一直显示，直到你停用或删除它。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
							<a-range-picker v-model="range" :locale="pickerLocale" showTime format="YYYY-MM-DD HH:mm" :placeholder="['立即开始', '不结束']" style="width: 100%;" />
						</a-form-item>
					</a-col>
					<!-- 右：英文 -->
					<a-col :xs="24" :md="12" class="col-right">
						<a-form-item>
							<span slot="label">英文标题 <a-tooltip title="选填；英文标题和正文不填的话，英文界面显示中文。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
							<a-input v-model="form.titleEn" :maxLength="100" placeholder="English title" />
						</a-form-item>
						<a-form-item label="英文正文">
							<a-textarea v-model="form.contentEn" :rows="6" :maxLength="2000" placeholder="English content" />
							<div class="count">{{ form.contentEn.length }} / 2000</div>
						</a-form-item>
						<a-form-item label="状态">
							<a-switch v-model="form.active" /> <span class="sw-text">{{ form.active ? '启用' : '停用（不会弹出）' }}</span>
						</a-form-item>
					</a-col>
				</a-row>
			</a-form>
		</a-modal>
	</div>
</template>

<script>
import moment from 'moment'
import 'moment/locale/zh-cn'
import pickerLocale from 'ant-design-vue/lib/date-picker/locale/zh_CN'
import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'
import { notifyError } from '@/utils/notify'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/api'

const PHASE = {
	live: { label: '生效中', color: 'green' },
	scheduled: { label: '未开始', color: 'blue' },
	expired: { label: '已结束', color: '' },
	inactive: { label: '已停用', color: '' }
}
const blank = () => ({ title: '', content: '', titleEn: '', contentEn: '', active: true })

export default {
	name: 'Announcements',
	mixins: [fixedListLayout],
	data() {
		return {
			PHASE,
			pickerLocale,
			// 不写列宽：全局表格样式把列平均分配
			columns: [
				{ title: '标题', dataIndex: 'title', key: 'title' },
				{ title: '内容', dataIndex: 'content', key: 'content', scopedSlots: { customRender: 'content' } },
				{ title: '状态', dataIndex: 'phase', key: 'phase', scopedSlots: { customRender: 'phase' } },
				{ title: '显示时间', key: 'period', scopedSlots: { customRender: 'period' } },
				{ title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', scopedSlots: { customRender: 'updatedAt' } },
				{ title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
			],
			list: [],
			loading: false,
			pagination: newPagination(),
			visible: false,
			saving: false,
			editingId: null,
			form: blank(),
			range: []
		}
	},
	created() {
		moment.locale('zh-cn')
		this.load()
	},
	methods: {
		fmt(v, empty) {
			return v ? moment(v).format('YYYY-MM-DD HH:mm') : empty
		},
		async load() {
			this.loading = true
			try {
				const res = await getAnnouncements({ page: this.pagination.current, pageSize: this.pagination.pageSize })
				if (res.code === 0) {
					this.list = res.data.list
					this.pagination.total = res.data.total
				}
			} catch (e) {
				notifyError(this, e, '获取公告列表失败')
			} finally {
				this.loading = false
			}
		},
		handleTableChange(p) {
			applyTableChange(this.pagination, p)
			this.load()
		},
		openAdd() {
			this.editingId = null
			this.form = blank()
			this.range = []
			this.visible = true
		},
		openEdit(r) {
			this.editingId = r.id
			this.form = { title: r.title, content: r.content, titleEn: r.titleEn || '', contentEn: r.contentEn || '', active: r.status === 'active' }
			this.range = r.startAt || r.endAt ? [r.startAt ? moment(r.startAt) : null, r.endAt ? moment(r.endAt) : null] : []
			this.visible = true
		},
		async save() {
			const f = this.form
			if (!f.title.trim()) return this.$message.warning('请填写标题')
			if (!f.content.trim()) return this.$message.warning('请填写正文')
			const [start, end] = this.range || []
			const body = {
				title: f.title,
				content: f.content,
				titleEn: f.titleEn,
				contentEn: f.contentEn,
				status: f.active ? 'active' : 'inactive',
				startAt: start ? start.toISOString() : null,
				endAt: end ? end.toISOString() : null
			}
			this.saving = true
			try {
				const res = this.editingId ? await updateAnnouncement(this.editingId, body) : await createAnnouncement(body)
				if (res.code === 0) {
					this.$message.success(this.editingId ? '已保存' : '公告已创建')
					this.visible = false
					this.load()
				}
			} catch (e) {
				notifyError(this, e, '保存失败')
			} finally {
				this.saving = false
			}
		},
		// 停用、启用都先确认：启用后客户打开小程序就会看到，停用后马上不再弹出
		toggle(r) {
			const stopping = r.status === 'active'
			this.$confirm({
				title: stopping ? `停用公告「${r.title}」？` : `启用公告「${r.title}」？`,
				content: stopping ? '停用后客户打开小程序不会再弹出这条公告，之后可以再启用。' : '启用后，客户打开小程序时会弹出这条公告（在显示时间段内，且还没看过的客户）。',
				okText: stopping ? '停用' : '启用',
				okType: stopping ? 'danger' : 'primary',
				cancelText: '取消',
				onOk: async () => {
					try {
						const res = await updateAnnouncement(r.id, { status: stopping ? 'inactive' : 'active' })
						if (res.code === 0) {
							this.$message.success(stopping ? '已停用' : '已启用')
							this.load()
						}
					} catch (e) {
						notifyError(this, e, '操作失败')
					}
				}
			})
		},
		remove(r) {
			this.$confirm({
				title: `删除公告「${r.title}」？`,
				content: '删除后不能恢复；只是暂时不想显示的话，用「停用」。',
				okText: '删除',
				okType: 'danger',
				cancelText: '取消',
				onOk: async () => {
					try {
						const res = await deleteAnnouncement(r.id)
						if (res.code === 0) {
							this.$message.success('已删除')
							if (this.list.length === 1 && this.pagination.current > 1) this.pagination.current -= 1
							this.load()
						}
					} catch (e) {
						notifyError(this, e, '删除失败')
					}
				}
			})
		}
	}
}
</script>

<style scoped>
.hint { margin-left: 16px; color: #8c8c8c; }
.col-left { padding-right: 24px; }
.col-right { padding-left: 24px; }
@media (min-width: 768px) { .col-right { border-left: 1px dashed #d9d9d9; } }
.help-icon { color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
.hint2 { color: #8c8c8c; font-size: 12px; margin-top: 6px; }
.count { text-align: right; color: #bfbfbf; font-size: 12px; }
.sw-text { margin-left: 8px; color: #595959; }
.content-cell { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-wrap; }
.row-actions { gap: 4px 14px; }
.act-danger { color: #cf1322; }
/* 已停用、已结束：灰色标签（antd 的 default 色在这套主题里字是白的，看不见） */
.tag-off { background: #f5f5f5; border-color: #d9d9d9; color: #8c8c8c; }
</style>
