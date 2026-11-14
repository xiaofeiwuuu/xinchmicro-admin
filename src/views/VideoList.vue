<!-- 教学视频：视频（集）。视频文件直传腾讯云点播（分片、断点续传），不经过我们的服务器；
     转码在点播里自动进行，服务端每分钟查一次转好没有，转好才能上架。价格、会员价、试看都设在这里。 -->
<template>
	<div>
		<div style="margin-bottom: 16px;">
			<a-form layout="inline">
				<a-form-item>
					<a-select v-model="courseId" allowClear placeholder="全部课程" size="small" style="width: 160px" @change="chapterId = undefined">
						<a-select-option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item>
					<a-select v-model="chapterId" allowClear placeholder="全部章节" size="small" style="width: 160px">
						<a-select-option v-for="ch in filterChapters" :key="ch.id" :value="ch.id">{{ ch.title }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item>
					<a-select v-model="state" allowClear placeholder="全部状态" size="small" style="width: 160px">
						<a-select-option value="processing">转码中</a-select-option>
						<a-select-option value="on">已上架</a-select-option>
						<a-select-option value="off">已下架</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item><a-input v-model="keyword" placeholder="请输入视频标题" size="small" style="width: 160px" /></a-form-item>
				<a-form-item>
					<a-button type="primary" size="small" @click="pagination.current = 1">查询</a-button>
					<a-button style="margin-left: 8px" size="small" @click="reset">重置</a-button>
				</a-form-item>
			</a-form>
		</div>
		<a-button v-can="'video.edit'" type="primary" icon="upload" size="small" style="margin-bottom: 16px;" @click="openModal()">上传视频</a-button>

		<a-table :scroll="tableScroll" :columns="columns" :data-source="rows" :loading="loading" rowKey="id" :pagination="pagination" @change="handleTableChange">
			<template slot="duration" slot-scope="text">{{ mmss(text) }}</template>
			<template slot="price" slot-scope="text">{{ text === 0 ? '免费' : '¥' + yuan(text) }}</template>
			<template slot="member" slot-scope="text">{{ text ? '¥' + yuan(text) : '-' }}</template>
			<template slot="trial" slot-scope="text">{{ text ? text + ' 秒' : '-' }}</template>
			<template slot="state" slot-scope="text, v">
				<a-tooltip v-if="v.transcodeStatus !== 'ready'" :title="v.stuck ? '转码超过 1 小时还没完成，可能失败了，请到腾讯云点播控制台看看，或删除后重新上传' : '转码要几分钟到几十分钟，系统每分钟自动检查'">
					<a-tag :color="v.stuck ? 'orange' : 'blue'">{{ v.stuck ? '可能失败' : '转码中' }}</a-tag>
				</a-tooltip>
				<template v-else>
					<a-switch size="small" :checked="v.onSale" :disabled="!can('video.edit')" @change="(on) => toggle(v, on)" />
				</template>
			</template>
			<div slot="action" slot-scope="text, v" class="row-actions">
				<a-button v-can="'video.edit'" type="link" size="small" @click="openModal(v)"><icon-edit /><span class="text-dark">编辑</span></a-button>
				<a-button v-if="v.transcodeStatus !== 'ready'" v-can="'video.edit'" type="link" size="small" @click="refresh(v)"><span class="text-dark">刷新状态</span></a-button>
				<a-button v-can="'video.edit'" type="link" size="small" @click="remove(v)"><icon-delete /><span class="text-danger">删除</span></a-button>
			</div>
		</a-table>

		<a-modal :title="form.id ? '编辑视频' : '上传视频'" :visible="visible" :confirmLoading="saving" :width="1000" :maskClosable="false" :okButtonProps="{ props: { disabled: uploading || (!form.id && !form.vodFileId) } }" okText="保存" @ok="save" @cancel="close">
			<a-form layout="horizontal" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
				<a-row type="flex" :gutter="0">
					<!-- 左：视频文件和归属 -->
					<a-col :xs="24" :md="12" class="col-left">
						<a-form-item v-if="!form.id" required>
							<span slot="label">视频文件 <a-tooltip title="选好文件就开始上传，上传期间先别关闭这个窗口；文件很大时先压缩会快很多。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
							<!-- 和其它页面的上传一样用 antd 的上传按钮（原来是浏览器自带的文件输入框，样式不一致）。beforeUpload 返回 false：不用 antd 自己上传，选了文件交给腾讯云的上传 SDK -->
							<a-upload :show-upload-list="false" accept="video/*" :before-upload="beforePick" :disabled="uploading || !!form.vodFileId">
								<a-button :disabled="uploading || !!form.vodFileId"><a-icon :type="uploading ? 'loading' : 'upload'" /> {{ uploading ? '上传中...' : '选择视频' }}</a-button>
							</a-upload>
							<div v-if="fileName" class="fname">{{ fileName }}</div>
							<div v-if="uploading || percent > 0" class="bar"><div class="fill" :style="{ width: percent + '%' }"></div></div>
							<div v-if="uploading" class="hint2 nl">上传中 {{ percent }}%　{{ speedText }}</div>
							<div v-else-if="form.vodFileId" class="hint2 nl ok">已上传，点「保存」后开始转码</div>
						</a-form-item>
						<a-form-item label="所属课程" required>
							<a-select v-model="form.courseId" :disabled="!!form.id" placeholder="请选择课程" @change="form.chapterId = undefined">
								<a-select-option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</a-select-option>
							</a-select>
						</a-form-item>
						<a-form-item label="所属章节">
							<a-select v-model="form.chapterId" allowClear placeholder="不放进章节（直接挂在课程下）">
								<a-select-option v-for="ch in formChapters" :key="ch.id" :value="ch.id">{{ ch.title }}</a-select-option>
							</a-select>
						</a-form-item>
						<a-form-item label="标题" required><a-input v-model="form.title" :maxLength="100" /></a-form-item>
						<a-form-item label="简介"><a-textarea v-model="form.intro" :rows="4" :maxLength="2000" /></a-form-item>
					</a-col>
					<!-- 右：价格、试看、排序 -->
					<a-col :xs="24" :md="12" class="col-right">
						<a-form-item :label-col="{ span: 9 }" :wrapper-col="{ span: 15 }"><span slot="label">价格（元） <a-tooltip title="0 = 免费"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span><a-input-number v-model="form.price" :min="0" :max="99999.99" :precision="2" style="width: 160px" /></a-form-item>
						<a-form-item :label-col="{ span: 9 }" :wrapper-col="{ span: 15 }">
							<span slot="label">会员价（元） <a-tooltip title="选填；必须低于价格。会员客户买这一集按会员价，非会员看不到会员价。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
							<a-input-number v-model="form.memberPrice" :min="0.01" :max="99999.99" :precision="2" style="width: 160px" placeholder="没有会员价" />
						</a-form-item>
						<a-form-item :label-col="{ span: 9 }" :wrapper-col="{ span: 15 }">
							<span slot="label">试看（秒） <a-tooltip title="0 = 不能试看；填多少秒，没买的人就能免费看前多少秒。想让整集免费，把价格设为 0。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
							<a-input-number v-model="form.trialSeconds" :min="0" :precision="0" style="width: 160px" />
						</a-form-item>
						<a-form-item :label-col="{ span: 9 }" :wrapper-col="{ span: 15 }"><span slot="label">排序 <a-tooltip title="数字小的在前"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span><a-input-number v-model="form.sortOrder" :precision="0" style="width: 160px" /></a-form-item>
						<a-form-item :label-col="{ span: 9 }" :wrapper-col="{ span: 15 }">
							<span slot="label">状态 <a-tooltip v-if="form.id && !form.ready" title="视频还没转码完成，转码完成后才能上架"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
							<a-switch v-model="form.onSale" :disabled="!!form.id && !form.ready" checked-children="上架" un-checked-children="下架" />
						</a-form-item>
					</a-col>
				</a-row>
			</a-form>
		</a-modal>
	</div>
</template>

<script>
import VodSdk from 'vod-js-sdk-v6/dist/vod-js-sdk-v6.js';
const TcVod = VodSdk.default || VodSdk.TcVod || VodSdk;
import fixedListLayout from '@/mixins/fixedListLayout';
import { newPagination, applyTableChange } from '@/utils/pagination';
import { notifyError } from '@/utils/notify';
import { can } from '@/utils/auth';
import { flatten, yuan, mmss, toFen } from '@/utils/video';
import { getVodUploadSignature, getVideoTree, saveVideoItem, deleteVideoItem, refreshVideoItem } from '@/api';
import IconEdit from '@/components/IconEdit.vue';
import IconDelete from '@/components/IconDelete.vue';

const blank = () => ({ id: null, courseId: undefined, chapterId: undefined, vodFileId: '', title: '', price: 0, memberPrice: null, trialSeconds: 0, intro: '', sortOrder: 0, onSale: false, ready: false });

export default {
	name: 'VideoList',
	components: { IconEdit, IconDelete },
	mixins: [fixedListLayout],
	data() {
		return {
			columns: [
				{ title: '标题', dataIndex: 'title', key: 'title' },
				{ title: '课程', dataIndex: 'courseTitle', key: 'courseTitle' },
				{ title: '章节', dataIndex: 'chapterTitle', key: 'chapterTitle' },
				{ title: '时长', dataIndex: 'durationSec', key: 'durationSec', scopedSlots: { customRender: 'duration' } },
				{ title: '价格', dataIndex: 'priceFen', key: 'priceFen', scopedSlots: { customRender: 'price' } },
				{ title: '会员价', dataIndex: 'memberPriceFen', key: 'memberPriceFen', scopedSlots: { customRender: 'member' } },
				{ title: '试看', dataIndex: 'trialSeconds', key: 'trialSeconds', scopedSlots: { customRender: 'trial' } },
				{ title: '播放量', dataIndex: 'playCount', key: 'playCount', customRender: (t) => t || 0 },
				{ title: '购买量', dataIndex: 'buyCount', key: 'buyCount', customRender: (t) => t || 0 },
				{ title: '收藏数', dataIndex: 'favoriteCount', key: 'favoriteCount', customRender: (t) => t || 0 },
				{ title: '状态', key: 'state', scopedSlots: { customRender: 'state' } },
				{ title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
			],
			courses: [], chapters: [], list: [], loading: false, pagination: newPagination(),
			courseId: undefined, chapterId: undefined, state: undefined, keyword: '',
			visible: false, saving: false, form: blank(),
			uploading: false, percent: 0, speed: 0, uploader: null, timer: null, fileName: ''
		};
	},
	computed: {
		speedText() { return this.speed ? (this.speed / 1024 / 1024).toFixed(2) + ' MB/s' : ''; },
		filterChapters() { return this.chapters.filter((c) => !this.courseId || c.courseId === this.courseId); },
		formChapters() { return this.chapters.filter((c) => c.courseId === this.form.courseId); },
		rows() {
			const k = this.keyword.trim();
			return this.list.filter((v) => {
				if (this.courseId && v.courseId !== this.courseId) return false;
				if (this.chapterId && v.chapterId !== this.chapterId) return false;
				if (k && !v.title.includes(k)) return false;
				if (this.state === 'processing') return v.transcodeStatus !== 'ready';
				if (this.state === 'on') return v.transcodeStatus === 'ready' && v.onSale;
				if (this.state === 'off') return v.transcodeStatus === 'ready' && !v.onSale;
				return true;
			});
		}
	},
	created() { this.load(); },
	mounted() {
		// 有视频在转码时，每 30 秒刷新一次（服务端每分钟会去查转好没有）
		this.timer = setInterval(() => { if (!this.visible && this.list.some((v) => v.transcodeStatus !== 'ready')) this.load(true); }, 30000);
	},
	beforeDestroy() { clearInterval(this.timer); if (this.uploader) this.uploader.cancel(); },
	methods: {
		can, yuan, mmss,
		handleTableChange(p) { applyTableChange(this.pagination, p); },
		reset() { this.courseId = undefined; this.chapterId = undefined; this.state = undefined; this.keyword = ''; },
		async load(silent) {
			if (!silent) this.loading = true;
			try {
				const res = await getVideoTree();
				if (res.code === 0) { const f = flatten(res.data); this.courses = f.courses; this.chapters = f.chapters; this.list = f.videos; }
			} catch (e) { if (!silent) notifyError(this, e, '获取视频失败'); } finally { this.loading = false; }
		},
		openModal(v) {
			this.percent = 0; this.speed = 0; this.fileName = '';
			this.form = v
				? { id: v.id, courseId: v.courseId, chapterId: v.chapterId || undefined, vodFileId: v.vodFileId, title: v.title, price: v.priceFen / 100, memberPrice: v.memberPriceFen ? v.memberPriceFen / 100 : null, trialSeconds: v.trialSeconds, intro: v.intro || '', sortOrder: v.sortOrder, onSale: !!v.onSale, ready: v.transcodeStatus === 'ready' }
				: { ...blank(), courseId: this.courseId, chapterId: this.chapterId };
			this.visible = true;
		},
		close() {
			if (this.uploader) this.uploader.cancel();
			this.uploading = false; this.visible = false;
		},
		// 选了文件就开始上传；标题没填时用文件名
		beforePick(file) {
			this.startUpload(file);
			return false;
		},
		async startUpload(file) {
			if (!file) return;
			this.fileName = file.name;
			if (!this.form.title) this.form.title = file.name.replace(/\.[^.]+$/, '').slice(0, 100);
			this.uploading = true; this.percent = 0;
			try {
				const tcVod = new TcVod({ getSignature: async () => (await getVodUploadSignature()).data.signature, allowReport: false });
				this.uploader = tcVod.upload({ mediaFile: file });
				this.uploader.on('media_progress', (info) => { this.percent = Math.floor((info.percent || 0) * 100); this.speed = info.speed || 0; });
				const done = await this.uploader.done();
				this.form.vodFileId = done.fileId;
				this.percent = 100;
			} catch (error) {
				if (!(error && /cancel/i.test(String(error.message || error)))) notifyError(this, error, '上传失败');
				this.fileName = '';
				this.percent = 0;
			} finally {
				this.uploading = false; this.uploader = null;
			}
		},
		async run(fn, ok, err) {
			this.saving = true;
			try {
				const res = await fn();
				if (res && res.code === 0) { if (ok) this.$message.success(ok); await this.load(true); return true; }
			} catch (e) { notifyError(this, e, err); } finally { this.saving = false; }
			return false;
		},
		async save() {
			const f = this.form;
			if (!f.courseId) return this.$message.warning('请选择所属课程');
			if (!f.title.trim()) return this.$message.warning('请填写标题');
			const body = { title: f.title, chapterId: f.chapterId || null, priceFen: toFen(f.price) || 0, memberPriceFen: toFen(f.memberPrice), trialSeconds: f.trialSeconds || 0, intro: f.intro, sortOrder: f.sortOrder || 0 };
			// 编辑时转码没完成的视频，开关是灰的，不带上下架（保持原样）；新增时想上架的，服务端看转码完没完成
			if (!f.id || f.ready) body.onSale = !!f.onSale;
			if (!f.id) { body.courseId = f.courseId; body.vodFileId = f.vodFileId; }
			this.saving = true;
			try {
				const res = await saveVideoItem(f.id, body);
				if (res && res.code === 0) {
					if (f.id) this.$message.success('已保存');
					else if (res.data.onSale) this.$message.success('已添加并上架');
					else this.$message.success(f.onSale ? '已添加，视频还在转码，转码完成后请到列表里上架' : '已添加，转码完成后可以上架');
					await this.load(true);
					this.visible = false;
				}
			} catch (e) { notifyError(this, e, '保存视频失败'); } finally { this.saving = false; }
		},
		toggle(v, on) {
			this.$confirm({
				title: on ? `确定上架「${v.title}」吗？` : `确定下架「${v.title}」吗？`,
				content: on ? '上架后，小程序里能看到这个视频（课程和章节也要是上架的）。' : '下架后，小程序里看不到这个视频。已购买的客户也暂时看不到。',
				okText: on ? '上架' : '下架', cancelText: '取消',
				onOk: async () => { if (!(await this.run(() => saveVideoItem(v.id, { onSale: on }), on ? '已上架' : '已下架', '操作失败'))) this.load(true); }
			});
		},
		refresh(v) { return this.run(() => refreshVideoItem(v.id), '已刷新', '刷新失败'); },
		remove(v) {
			this.$confirm({
				title: '确定删除这个视频吗？', content: `「${v.title}」删除后，云点播里的视频文件也会一起删掉，不能恢复。`, okText: '删除', okType: 'danger', cancelText: '取消',
				onOk: () => this.run(() => deleteVideoItem(v.id), '已删除', '删除视频失败')
			});
		}
	}
};
</script>

<style scoped>
.fname { margin-top: 6px; color: #595959; line-height: 1.5; word-break: break-all; }
.hint2 { color: #8c8c8c; font-size: 12px; margin-left: 8px; }
.hint2.nl { margin-left: 0; display: block; }
.hint2.ok { color: #52c41a; }
.col-left { padding-right: 24px; }
.col-right { padding-left: 24px; }
@media (min-width: 768px) { .col-right { border-left: 1px dashed #d9d9d9; } }
.help-icon { color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
.bar { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; margin: 8px 0; }
.fill { height: 100%; background: #1677ff; transition: width .2s; }
</style>
