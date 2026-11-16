<!-- 给某个客户手动开通 / 赠送视频（客户管理列表每一行「更多」里的「赠送视频」）。
     用法：<grant-video-modal v-model="visible" :customer="{ id, nickname, phone }" @done="..." /> -->
<template>
	<a-modal :title="'赠送视频' + (customer ? '：' + (customer.nickname || '客户') + '（#' + customer.id + '）' : '')" :visible="value" :width="620" :maskClosable="false" okText="开通" :confirmLoading="saving" @ok="submit" @cancel="close">
		<a-form layout="horizontal" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
			<a-form-item required label="视频">
				<a-select v-model="form.videoIds" mode="multiple" :max-tag-count="3" placeholder="选择要开通的视频（可多选、可搜索）" option-filter-prop="label">
					<a-select-option v-for="v in videos" :key="v.id" :value="v.id" :label="v.courseTitle + ' ' + v.title">{{ v.courseTitle }}　{{ v.title }}</a-select-option>
				</a-select>
				<div class="g-quick">
					快速选整个课程：
					<a-select size="small" style="width: 200px" placeholder="选课程，把它的视频都加上" :value="undefined" @change="addCourse">
						<a-select-option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}（{{ c.videoCount }} 集）</a-select-option>
					</a-select>
					<a v-if="form.videoIds.length" style="margin-left: 12px" @click="form.videoIds = []">清空（已选 {{ form.videoIds.length }} 集）</a>
				</div>
			</a-form-item>
			<a-form-item required label="原因">
				<a-input v-model="form.reason" :maxLength="100" placeholder="请填写原因" />
				<div class="g-quick"><a v-for="r in REASONS" :key="r" @click="form.reason = r">{{ r }}</a></div>
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<script>
import { notifyError } from '@/utils/notify';
import { flatten } from '@/utils/video';
import { getVideoTree, createVideoGrant } from '@/api';

export default {
	name: 'GrantVideoModal',
	props: {
		value: { type: Boolean, default: false }, // 显示
		customer: { type: Object, default: null } // { id, nickname, phone }
	},
	data() {
		return { REASONS: ['付款异常补开通', '赠送客户', '内部测试', '会员福利'], saving: false, form: { videoIds: [], reason: '' }, courses: [], videos: [] };
	},
	watch: {
		// 打开时清空表单并取一次视频列表（用视频管理的目录树摊平）
		async value(v) {
			if (!v) return;
			this.form = { videoIds: [], reason: '' };
			try {
				const res = await getVideoTree();
				if (res.code === 0) { const f = flatten(res.data); this.courses = f.courses; this.videos = f.videos; }
			} catch (e) { notifyError(this, e, '获取视频列表失败'); }
		}
	},
	methods: {
		close() { this.$emit('input', false); },
		addCourse(courseId) {
			const ids = this.videos.filter((v) => v.courseId === courseId).map((v) => v.id);
			this.form.videoIds = [...new Set([...this.form.videoIds, ...ids])];
		},
		async submit() {
			const f = this.form;
			if (!this.customer) return;
			if (!f.videoIds.length) return this.$message.warning('请选择要开通的视频');
			if (!f.reason.trim()) return this.$message.warning('请填写开通原因');
			this.saving = true;
			try {
				const r = await createVideoGrant({ customerId: this.customer.id, videoIds: f.videoIds, reason: f.reason.trim() });
				const n = (r.granted || []).length; const sk = r.skipped || [];
				if (n) this.$message.success(`已开通 ${n} 集${sk.length ? `，跳过 ${sk.length} 集（${sk[0].reason}）` : ''}`);
				else this.$message.warning(sk.length ? `没有新开通：${sk[0].reason}` : '没有新开通的');
				this.$emit('done');
				this.close();
			} catch (e) { notifyError(this, e, '开通失败'); } finally { this.saving = false; }
		}
	}
};
</script>

<style scoped>
.g-quick { margin-top: 6px; color: #8c8c8c; font-size: 12px; }
.g-quick > a { margin-right: 12px; }
</style>
