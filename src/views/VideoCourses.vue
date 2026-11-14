<!-- 教学视频：课程。课程 → 章节 → 视频（集），价格设在「集」上，课程只用来分组和展示。 -->
<template>
	<div>
		<div style="margin-bottom: 16px;">
			<a-form layout="inline">
				<a-form-item><a-input v-model="keyword" placeholder="请输入课程名称" size="small" style="width: 160px" /></a-form-item>
				<a-form-item>
					<a-button type="primary" size="small" @click="pagination.current = 1">查询</a-button>
					<a-button style="margin-left: 8px" size="small" @click="keyword = ''">重置</a-button>
				</a-form-item>
			</a-form>
		</div>
		<a-button v-can="'video.edit'" type="primary" icon="plus" size="small" style="margin-bottom: 16px;" @click="openModal()">新增课程</a-button>

		<a-table :scroll="tableScroll" :columns="columns" :data-source="rows" :loading="loading" rowKey="id" :pagination="pagination" @change="handleTableChange">
			<template slot="status" slot-scope="text, record">
				<a-switch size="small" :checked="record.status === 'active'" :disabled="!can('video.edit')" @change="(on) => toggle(record, on)" />
			</template>
			<div slot="action" slot-scope="text, record" class="row-actions">
				<a-button v-can="'video.edit'" type="link" size="small" @click="openModal(record)"><icon-edit /><span class="text-dark">编辑</span></a-button>
				<a-button v-can="'video.edit'" type="link" size="small" @click="remove(record)"><icon-delete /><span class="text-danger">删除</span></a-button>
			</div>
		</a-table>

		<a-modal :title="form.id ? '编辑课程' : '新增课程'" :visible="visible" :confirmLoading="saving" :maskClosable="false" okText="保存" @ok="save" @cancel="visible = false">
			<a-form layout="horizontal" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
				<a-form-item label="课程名称" required><a-input v-model="form.title" :maxLength="100" /></a-form-item>
				<a-form-item label="简介"><a-textarea v-model="form.intro" :rows="4" :maxLength="2000" /></a-form-item>
				<a-form-item><span slot="label">排序 <a-tooltip title="数字小的在前"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span><a-input-number v-model="form.sortOrder" :precision="0" /></a-form-item>
				<a-form-item label="状态"><a-switch v-model="form.on" checked-children="上架" un-checked-children="下架" /></a-form-item>
			</a-form>
		</a-modal>
	</div>
</template>

<script>
import fixedListLayout from '@/mixins/fixedListLayout';
import { newPagination, applyTableChange } from '@/utils/pagination';
import { notifyError } from '@/utils/notify';
import { can } from '@/utils/auth';
import { flatten } from '@/utils/video';
import { getVideoTree, saveVideoCourse, deleteVideoCourse } from '@/api';
import IconEdit from '@/components/IconEdit.vue';
import IconDelete from '@/components/IconDelete.vue';

const blank = () => ({ id: null, title: '', intro: '', sortOrder: 0, on: false });

export default {
	name: 'VideoCourses',
	components: { IconEdit, IconDelete },
	mixins: [fixedListLayout],
	data() {
		return {
			// 不写列宽：全局表格样式把列平均分配
			columns: [
				{ title: '课程名称', dataIndex: 'title', key: 'title' },
				{ title: '章节数', dataIndex: 'chapterCount', key: 'chapterCount' },
				{ title: '视频数', dataIndex: 'videoCount', key: 'videoCount' },
				{ title: '排序', dataIndex: 'sortOrder', key: 'sortOrder' },
				{ title: '状态', key: 'status', scopedSlots: { customRender: 'status' } },
				{ title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
			],
			list: [], keyword: '', loading: false, pagination: newPagination(),
			visible: false, saving: false, form: blank()
		};
	},
	computed: {
		rows() {
			const k = this.keyword.trim();
			return k ? this.list.filter((c) => c.title.includes(k)) : this.list;
		}
	},
	created() { this.load(); },
	methods: {
		can,
		handleTableChange(p) { applyTableChange(this.pagination, p); },
		async load() {
			this.loading = true;
			try {
				const res = await getVideoTree();
				if (res.code === 0) this.list = flatten(res.data).courses;
			} catch (e) { notifyError(this, e, '获取课程失败'); } finally { this.loading = false; }
		},
		openModal(c) { this.form = c ? { id: c.id, title: c.title, intro: c.intro || '', sortOrder: c.sortOrder, on: c.status === 'active' } : blank(); this.visible = true; },
		async run(fn, ok, err) {
			this.saving = true;
			try {
				const res = await fn();
				if (res && res.code === 0) { this.$message.success(ok); await this.load(); return true; }
			} catch (e) { notifyError(this, e, err); } finally { this.saving = false; }
			return false;
		},
		async save() {
			const f = this.form;
			if (!f.title.trim()) return this.$message.warning('请填写课程名称');
			if (await this.run(() => saveVideoCourse(f.id, { title: f.title, intro: f.intro, sortOrder: f.sortOrder || 0, status: f.on ? 'active' : 'inactive' }), '已保存', '保存课程失败')) this.visible = false;
		},
		toggle(c, on) {
			this.$confirm({
				title: on ? `确定上架「${c.title}」吗？` : `确定下架「${c.title}」吗？`,
				content: on ? '上架后，小程序里能看到这个课程（里面的章节和视频也要是上架的）。' : '下架后，小程序里看不到这个课程和里面所有的视频。已购买的客户也暂时看不到。',
				okText: on ? '上架' : '下架', cancelText: '取消',
				onOk: () => this.run(() => saveVideoCourse(c.id, { status: on ? 'active' : 'inactive' }), on ? '已上架' : '已下架', '操作失败')
			});
		},
		remove(c) {
			this.$confirm({
				title: '确定删除这个课程吗？', content: `「${c.title}」下面如果还有章节或视频，需要先删除它们。`, okText: '删除', okType: 'danger', cancelText: '取消',
				onOk: () => this.run(() => deleteVideoCourse(c.id), '已删除', '删除课程失败')
			});
		}
	}
};
</script>

<style scoped>
.help-icon { color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
</style>
