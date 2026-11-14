<!-- 教学视频：章节。属于某个课程；视频可以放进章节，也可以直接挂在课程下。 -->
<template>
	<div>
		<div style="margin-bottom: 16px;">
			<a-form layout="inline">
				<a-form-item>
					<a-select v-model="courseId" allowClear placeholder="全部课程" size="small" style="width: 160px">
						<a-select-option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item><a-input v-model="keyword" placeholder="请输入章节名称" size="small" style="width: 160px" /></a-form-item>
				<a-form-item>
					<a-button type="primary" size="small" @click="pagination.current = 1">查询</a-button>
					<a-button style="margin-left: 8px" size="small" @click="reset">重置</a-button>
				</a-form-item>
			</a-form>
		</div>
		<a-button v-can="'video.edit'" type="primary" icon="plus" size="small" style="margin-bottom: 16px;" @click="openModal()">新增章节</a-button>

		<a-table :scroll="tableScroll" :columns="columns" :data-source="rows" :loading="loading" rowKey="id" :pagination="pagination" @change="handleTableChange">
			<template slot="status" slot-scope="text, record">
				<a-switch size="small" :checked="record.status === 'active'" :disabled="!can('video.edit')" @change="(on) => toggle(record, on)" />
			</template>
			<div slot="action" slot-scope="text, record" class="row-actions">
				<a-button v-can="'video.edit'" type="link" size="small" @click="openModal(record)"><icon-edit /><span class="text-dark">编辑</span></a-button>
				<a-button v-can="'video.edit'" type="link" size="small" @click="remove(record)"><icon-delete /><span class="text-danger">删除</span></a-button>
			</div>
		</a-table>

		<a-modal :title="form.id ? '编辑章节' : '新增章节'" :visible="visible" :confirmLoading="saving" :maskClosable="false" okText="保存" @ok="save" @cancel="visible = false">
			<a-form layout="horizontal" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
				<a-form-item label="所属课程" required>
					<a-select v-model="form.courseId" :disabled="!!form.id" placeholder="请选择课程">
						<a-select-option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item label="章节名称" required><a-input v-model="form.title" :maxLength="100" /></a-form-item>
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
import { getVideoTree, saveVideoChapter, deleteVideoChapter } from '@/api';
import IconEdit from '@/components/IconEdit.vue';
import IconDelete from '@/components/IconDelete.vue';

const blank = () => ({ id: null, courseId: undefined, title: '', sortOrder: 0, on: false });

export default {
	name: 'VideoChapters',
	components: { IconEdit, IconDelete },
	mixins: [fixedListLayout],
	data() {
		return {
			columns: [
				{ title: '章节名称', dataIndex: 'title', key: 'title' },
				{ title: '所属课程', dataIndex: 'courseTitle', key: 'courseTitle' },
				{ title: '视频数', dataIndex: 'videoCount', key: 'videoCount' },
				{ title: '排序', dataIndex: 'sortOrder', key: 'sortOrder' },
				{ title: '状态', key: 'status', scopedSlots: { customRender: 'status' } },
				{ title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
			],
			courses: [], list: [], courseId: undefined, keyword: '', loading: false, pagination: newPagination(),
			visible: false, saving: false, form: blank()
		};
	},
	computed: {
		rows() {
			const k = this.keyword.trim();
			return this.list.filter((c) => (!this.courseId || c.courseId === this.courseId) && (!k || c.title.includes(k)));
		}
	},
	created() { this.load(); },
	methods: {
		can,
		handleTableChange(p) { applyTableChange(this.pagination, p); },
		reset() { this.courseId = undefined; this.keyword = ''; },
		async load() {
			this.loading = true;
			try {
				const res = await getVideoTree();
				if (res.code === 0) { const f = flatten(res.data); this.courses = f.courses; this.list = f.chapters; }
			} catch (e) { notifyError(this, e, '获取章节失败'); } finally { this.loading = false; }
		},
		openModal(ch) {
			this.form = ch ? { id: ch.id, courseId: ch.courseId, title: ch.title, sortOrder: ch.sortOrder, on: ch.status === 'active' } : { ...blank(), courseId: this.courseId };
			this.visible = true;
		},
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
			if (!f.courseId) return this.$message.warning('请选择所属课程');
			if (!f.title.trim()) return this.$message.warning('请填写章节名称');
			const status = f.on ? 'active' : 'inactive';
			const body = f.id ? { title: f.title, sortOrder: f.sortOrder || 0, status } : { courseId: f.courseId, title: f.title, sortOrder: f.sortOrder || 0, status };
			if (await this.run(() => saveVideoChapter(f.id, body), '已保存', '保存章节失败')) this.visible = false;
		},
		toggle(ch, on) {
			this.$confirm({
				title: on ? `确定上架「${ch.title}」吗？` : `确定下架「${ch.title}」吗？`,
				content: on ? '上架后，小程序里能看到这个章节和里面已上架的视频。' : '下架后，小程序里看不到这个章节和里面所有的视频。已购买的客户也暂时看不到。',
				okText: on ? '上架' : '下架', cancelText: '取消',
				onOk: () => this.run(() => saveVideoChapter(ch.id, { status: on ? 'active' : 'inactive' }), on ? '已上架' : '已下架', '操作失败')
			});
		},
		remove(ch) {
			this.$confirm({
				title: '确定删除这个章节吗？', content: `「${ch.title}」下面如果还有视频，需要先删除或移走。`, okText: '删除', okType: 'danger', cancelText: '取消',
				onOk: () => this.run(() => deleteVideoChapter(ch.id), '已删除', '删除章节失败')
			});
		}
	}
};
</script>

<style scoped>
.help-icon { color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
</style>
