<!-- 教学视频：视频（集）。视频文件直传腾讯云点播（分片、断点续传），不经过我们的服务器；
     转码在点播里自动进行，服务端每分钟查一次转好没有，转好才能上架。价格、会员价、试看都设在这里。 -->
<template>
	<div>
		<div style="margin-bottom: 8px;">
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
		<div class="act-row">
			<div>
				<a-button v-can="'video.edit'" type="primary" icon="upload" size="small" @click="openModal()">上传视频</a-button>
				<!-- 云点播里一共有多少文件、哪些是没人用的孤儿文件（只有主账号能看和清理） -->
				<a-button v-if="isMain" size="small" icon="cloud" style="margin-left: 8px;" @click="openVodFiles">云点播文件</a-button>
			</div>
			<!-- 播放量、购买量、收藏数三列默认折叠起来，点这里展开；展开后每一列表头都能点着排序（先点是从高到低，再点从低到高，再点取消） -->
			<a-button class="stat-toggle" size="small" style="margin-left: auto;" @click="toggleStats"><a-icon type="down" :class="{ flip: showStats }" /> {{ showStats ? '收起数据' : '展开数据' }}（播放量 · 购买量 · 收藏数）</a-button>
		</div>

		<a-table :scroll="tableScroll" :columns="tableColumns" :data-source="rows" :loading="loading" rowKey="id" :pagination="pagination" @change="handleTableChange">
			<!-- 名称：点一下复制（页面文字默认不能选中，所以做成点击复制） -->
			<template slot="copy" slot-scope="text">
				<span v-if="text && text !== '-'" class="copy-cell" title="点击复制" @click="copyName(text)">{{ text }}</span>
				<span v-else>{{ text || '-' }}</span>
			</template>
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
				<a-button type="link" size="small" @click="openDetail(v)"><a-icon type="eye" style="color: #111827" /><span class="text-dark">详情</span></a-button>
				<!-- 编辑、刷新转码状态、删除收进「更多」，和产品、订单、客户页一致；各项按权限显示，转码完成的视频没有「刷新」 -->
				<a-dropdown v-if="moreItems(v).length" :trigger="['click']" placement="bottomRight">
					<a-button type="link" size="small" @click.prevent><a-icon type="ellipsis" style="color: #111827" /><span class="text-dark">更多</span></a-button>
					<a-menu slot="overlay" @click="(e) => onMore(v, e.key)">
						<a-menu-item v-for="m in moreItems(v)" :key="m.key"><span :class="{ 'act-danger': m.danger }">{{ m.label }}</span></a-menu-item>
					</a-menu>
				</a-dropdown>
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
		<!-- 云点播文件：统计 + 孤儿文件清理（仅主账号）。每一类都列出来，看得出是哪个文件、哪个视频；删除不可恢复，所以只能在「孤儿」里逐个勾选，没有「全部删除」 -->
		<a-modal title="云点播文件" :visible="vfVisible" :width="860" :footer="null" @cancel="vfVisible = false">
			<a-spin :spinning="vfLoading">
				<div v-if="vf">
					<div class="vf-sum">
						点播里共 <b>{{ vf.vodTotal }}</b> 个文件，占 {{ sizeText(vf.totalSize) }}。<span v-if="vf.truncated" class="vf-warn">文件太多，只统计了最新的 {{ vf.listed }} 个，没统计到的不会被删。</span>
					</div>
					<a-radio-group v-model="vfView" button-style="solid" size="small" class="vf-tabs">
						<a-radio-button value="orphan">孤儿 {{ vf.orphanCount }}</a-radio-button>
						<a-radio-button value="recent">刚上传 {{ vf.recentCount }}</a-radio-button>
						<a-radio-button value="used">使用中 {{ vf.usedCount }}</a-radio-button>
						<a-radio-button value="missing">视频找不到文件 {{ vf.missingCount }}</a-radio-button>
					</a-radio-group>
					<div class="vf-note">{{ vfHelp }}</div>
					<a-table size="small" :rowKey="vfView === 'missing' ? 'videoId' : 'fileId'" :columns="vfCols" :data-source="vfRows" :pagination="false" :scroll="{ y: 300 }" :row-selection="vfView === 'orphan' ? { selectedRowKeys: vfSelected, onChange: (k) => (vfSelected = k) } : null" :locale="{ emptyText: vfEmpty }">
						<template slot="fid" slot-scope="text"><span class="copy-cell" title="点击复制" @click="copyName(text)">{{ text }}</span></template>
						<template slot="size" slot-scope="text">{{ sizeText(text) }}</template>
						<template slot="ctime" slot-scope="text">{{ timeText(text) }}</template>
						<template slot="vids" slot-scope="text">{{ (text || []).join('、') || '-' }}</template>
					</a-table>
					<div class="vf-foot">
						<a-button size="small" @click="loadVodFiles"><a-icon type="reload" />重新统计</a-button>
						<a-button v-if="vfView === 'orphan'" type="danger" size="small" :disabled="!vfSelected.length" :loading="vfDeleting" style="margin-left: 8px;" @click="confirmDeleteVodFiles">删除选中的 {{ vfSelected.length }} 个</a-button>
					</div>
				</div>
			</a-spin>
		</a-modal>

		<!-- 详情：课程、章节、简介、价格、数据这些放在这里，列表里只留最常看的。封面和信息放在同一张卡片里：上面是封面 + 标题 + 课程章节 + 状态，下面是其余信息；没有按钮，右上角叉关闭 -->
		<a-modal title="视频详情" :visible="detailVisible" :width="680" :footer="null" @cancel="detailVisible = false">
			<div v-if="detail" class="dt-card">
				<div class="dt-head">
					<img v-if="detail.coverUrl" :src="detail.coverUrl" class="dt-cover" alt="" />
					<div v-else class="dt-cover dt-nocover">▶</div>
					<div class="dt-main">
						<div class="dt-title"><span class="copy-cell" title="点击复制" @click="copyName(detail.title)">{{ detail.title }}</span></div>
						<div class="dt-path">
							<span class="copy-cell" title="点击复制" @click="copyName(detail.courseTitle)">{{ detail.courseTitle }}</span>
							<span class="dt-sep">›</span>
							<span v-if="detail.chapterTitle && detail.chapterTitle !== '-'" class="copy-cell" title="点击复制" @click="copyName(detail.chapterTitle)">{{ detail.chapterTitle }}</span>
							<span v-else class="dt-empty">没有放进章节</span>
						</div>
						<div class="dt-tags">
							<a-tag :color="detailTag.color">{{ detailTag.text }}</a-tag>
						</div>
					</div>
				</div>
				<div class="dt-grid">
					<div class="dt-k">价格</div><div class="dt-v">{{ detail.priceFen === 0 ? '免费' : '¥' + yuan(detail.priceFen) }}</div>
					<div class="dt-k">会员价</div><div class="dt-v">{{ detail.memberPriceFen ? '¥' + yuan(detail.memberPriceFen) : '没有' }}</div>
					<div class="dt-k">试看</div><div class="dt-v">{{ detail.trialSeconds ? detail.trialSeconds + ' 秒' : '不能试看' }}</div>
					<div class="dt-k">时长</div><div class="dt-v">{{ mmss(detail.durationSec) }}</div>
					<div class="dt-k">排序</div><div class="dt-v">{{ detail.sortOrder || 0 }}（数字小的在前）</div>
					<div class="dt-k">数据</div><div class="dt-v">播放 {{ detail.playCount || 0 }} · 购买 {{ detail.buyCount || 0 }} · 收藏 {{ detail.favoriteCount || 0 }}</div>
					<div class="dt-k">简介</div><div class="dt-v dt-pre"><template v-if="detail.intro">{{ detail.intro }}</template><span v-else class="dt-empty">没有简介</span></div>
					<div class="dt-k">点播文件</div><div class="dt-v"><span class="copy-cell" title="点击复制" @click="copyName(detail.vodFileId)">{{ detail.vodFileId }}</span></div>
				</div>
			</div>
		</a-modal>
	</div>
</template>

<script>
import VodSdk from 'vod-js-sdk-v6/dist/vod-js-sdk-v6.js';
const TcVod = VodSdk.default || VodSdk.TcVod || VodSdk;
import fixedListLayout from '@/mixins/fixedListLayout';
import { newPagination, applyTableChange } from '@/utils/pagination';
import { notifyError } from '@/utils/notify';
import { copyToClipboard } from '@/utils/copy';
import { can, isMainUser } from '@/utils/auth';
import { formatSize } from '@/utils/storageListing';
import { flatten, yuan, mmss, toFen } from '@/utils/video';
import { getVodFiles, deleteVodFiles, getVodUploadSignature, getVideoTree, saveVideoItem, deleteVideoItem, refreshVideoItem } from '@/api';
import IconEdit from '@/components/IconEdit.vue';
import IconDelete from '@/components/IconDelete.vue';

const blank = () => ({ id: null, courseId: undefined, chapterId: undefined, vodFileId: '', title: '', price: 0, memberPrice: null, trialSeconds: 0, intro: '', sortOrder: 0, onSale: false, ready: false });

export default {
	name: 'VideoList',
	components: { IconEdit, IconDelete },
	mixins: [fixedListLayout],
	data() {
		return {
			sortKey: '', // 按哪一列排序，空 = 默认顺序
			sortOrder: '', // descend 从高到低 / ascend 从低到高
			isMain: isMainUser(),
			vfVisible: false, vfLoading: false, vfDeleting: false, vf: null, vfSelected: [], // 云点播文件弹窗
			vfView: 'orphan', // 弹窗里当前看哪一类：orphan 孤儿 / recent 刚上传 / used 使用中 / missing 视频找不到文件
			detailVisible: false, // 详情弹窗
			detail: null,
			showStats: (() => { try { return localStorage.getItem('videoStatsOpen') === '1'; } catch (e) { return false; } })(), // 数据三列是否展开（记在浏览器里，默认折叠）
			columns: [
				{ title: '标题', dataIndex: 'title', key: 'title', scopedSlots: { customRender: 'copy' } },
				{ title: '时长', dataIndex: 'durationSec', key: 'durationSec', scopedSlots: { customRender: 'duration' } },
				{ title: '价格', dataIndex: 'priceFen', key: 'priceFen', scopedSlots: { customRender: 'price' } },
				{ title: '会员价', dataIndex: 'memberPriceFen', key: 'memberPriceFen', scopedSlots: { customRender: 'member' } },
				{ title: '试看', dataIndex: 'trialSeconds', key: 'trialSeconds', scopedSlots: { customRender: 'trial' } },
				{ title: '播放量', dataIndex: 'playCount', key: 'playCount', customRender: (t) => t || 0, sorter: true, sortDirections: ['descend', 'ascend'] },
				{ title: '购买量', dataIndex: 'buyCount', key: 'buyCount', customRender: (t) => t || 0, sorter: true, sortDirections: ['descend', 'ascend'] },
				{ title: '收藏数', dataIndex: 'favoriteCount', key: 'favoriteCount', customRender: (t) => t || 0, sorter: true, sortDirections: ['descend', 'ascend'] },
				// 状态只有一个开关或一个「转码中」标签，窄；操作列是「详情 + 更多」两个按钮（编辑、刷新、删除在「更多」里）。课程、章节不再单独占两列，放进「详情」里
				// 「排序」就是上传视频、编辑弹窗里填的那个数字：数字小的在前。列表默认也是按它排的（同一课程、同一章节里），这一列把它显示出来，点表头可以整体按它排
				{ title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 80, customRender: (t) => (t === undefined || t === null ? 0 : t), sorter: true, sortDirections: ['ascend', 'descend'] },
				{ title: '状态', key: 'state', width: 80, scopedSlots: { customRender: 'state' } },
				{ title: '操作', key: 'action', align: 'right', width: 170, scopedSlots: { customRender: 'action' } }
			],
			courses: [], chapters: [], list: [], loading: false, pagination: newPagination(),
			courseId: undefined, chapterId: undefined, state: undefined, keyword: '',
			visible: false, saving: false, form: blank(),
			uploading: false, percent: 0, speed: 0, uploader: null, timer: null, fileName: ''
		};
	},
	computed: {
		// 折叠时不显示播放量、购买量、收藏数这三列
		tableColumns() {
			const cols = this.showStats ? this.columns : this.columns.filter((c) => !['playCount', 'buyCount', 'favoriteCount'].includes(c.key));
			// 表头排序箭头的亮灭由 sortKey / sortOrder 决定（受控）
			return cols.map((c) => (c.sorter ? { ...c, sortOrder: this.sortKey === c.key ? this.sortOrder : false } : c));
		},
		// 云点播文件弹窗：当前这一类的表格列、数据、说明、空状态
		vfCols() {
			const name = { title: '文件名', dataIndex: 'name', key: 'name', ellipsis: true };
			const fid = { title: '文件 ID', dataIndex: 'fileId', key: 'fileId', width: 170, scopedSlots: { customRender: 'fid' } };
			const size = { title: '大小', dataIndex: 'size', key: 'size', width: 80, scopedSlots: { customRender: 'size' } };
			const ctime = { title: '上传时间', dataIndex: 'createTime', key: 'createTime', width: 150, scopedSlots: { customRender: 'ctime' } };
			if (this.vfView === 'used') return [name, { title: '用在哪个视频', dataIndex: 'videos', key: 'videos', scopedSlots: { customRender: 'vids' } }, size, ctime];
			if (this.vfView === 'missing') return [
				{ title: '视频标题', dataIndex: 'title', key: 'title', ellipsis: true },
				{ title: '所属课程', dataIndex: 'courseTitle', key: 'courseTitle', ellipsis: true },
				{ title: '记录的点播文件 ID', dataIndex: 'vodFileId', key: 'vodFileId', width: 190, scopedSlots: { customRender: 'fid' } }
			];
			return [name, fid, size, ctime];
		},
		vfRows() {
			const v = this.vf || {};
			return ({ orphan: v.orphans, recent: v.recent, used: v.used, missing: v.missing }[this.vfView]) || [];
		},
		vfHelp() {
			const h = this.vf ? this.vf.minAgeHours : 24;
			return {
				orphan: '点播里有、但没有任何视频在用的文件，可以清理。如果这个点播应用还被别的业务共用，里面可能有别人的视频，删之前请认真核对文件名。删除后不能恢复。',
				recent: `上传还不到 ${h} 小时的文件，可能刚传完、正在填表单还没点「保存」，所以先不算孤儿、不能删。满 ${h} 小时还没有视频用它，就会出现在「孤儿」里，到时可以清理。`,
				used: '正在被视频使用的文件，不能删。',
				missing: '这些视频记录指向的点播文件不存在，所以播不出来。要么重新上传视频，要么在视频列表里把这条记录删掉（如果是测试数据）。'
			}[this.vfView];
		},
		vfEmpty() { return { orphan: '没有孤儿文件，不用清理', recent: '没有刚上传的文件', used: '还没有视频在用点播文件', missing: '所有视频记录都能在点播里找到文件' }[this.vfView]; },
		// 详情顶部的状态标签：颜色 + 文字
		detailTag() {
			const v = this.detail;
			if (!v) return { text: '', color: '' };
			if (v.transcodeStatus !== 'ready') return v.stuck ? { text: '转码可能失败', color: 'orange' } : { text: '转码中', color: 'blue' };
			return v.onSale ? { text: '已上架', color: 'green' } : { text: '已下架', color: '' };
		},
		speedText() { return this.speed ? (this.speed / 1024 / 1024).toFixed(2) + ' MB/s' : ''; },
		filterChapters() { return this.chapters.filter((c) => !this.courseId || c.courseId === this.courseId); },
		formChapters() { return this.chapters.filter((c) => c.courseId === this.form.courseId); },
		rows() {
			const k = this.keyword.trim();
			const arr = this.list.filter((v) => {
				if (this.courseId && v.courseId !== this.courseId) return false;
				if (this.chapterId && v.chapterId !== this.chapterId) return false;
				if (k && !v.title.includes(k)) return false;
				if (this.state === 'processing') return v.transcodeStatus !== 'ready';
				if (this.state === 'on') return v.transcodeStatus === 'ready' && v.onSale;
				if (this.state === 'off') return v.transcodeStatus === 'ready' && !v.onSale;
				return true;
			});
			// 排序：数字大小，一样大的保持原来的先后（用 id 兜底，顺序稳定）
			if (this.sortKey) {
				const dir = this.sortOrder === 'ascend' ? 1 : -1;
				const key = this.sortKey;
				arr.sort((a, b) => dir * ((a[key] || 0) - (b[key] || 0)) || a.id - b.id);
			}
			return arr;
		}
	},
	created() { this.load(); },
	mounted() {
		// 有视频在转码时，每 30 秒刷新一次（服务端每分钟会去查转好没有）
		this.timer = setInterval(() => { if (!this.visible && this.list.some((v) => v.transcodeStatus !== 'ready')) this.load(true); }, 30000);
	},
	beforeDestroy() { clearInterval(this.timer); if (this.uploader) this.uploader.cancel(); },
	methods: {
		async copyName(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制：' + text);
			else this.$message.warning('复制失败，请手动复制');
		},
		can, yuan, mmss,
		handleTableChange(p, filters, sorter) {
			applyTableChange(this.pagination, p);
			const next = sorter && sorter.order ? sorter.columnKey : '';
			if (next !== this.sortKey || (sorter && (sorter.order || '') !== this.sortOrder)) this.pagination.current = 1; // 换了排序回到第 1 页
			this.sortKey = next;
			this.sortOrder = (sorter && sorter.order) || '';
		},
		moreItems(v) {
			const items = [];
			if (!can('video.edit')) return items;
			items.push({ key: 'edit', label: '编辑' });
			if (v.transcodeStatus !== 'ready') items.push({ key: 'refresh', label: '刷新转码状态' });
			items.push({ key: 'delete', label: '删除', danger: true });
			return items;
		},
		onMore(v, key) {
			if (key === 'edit') this.openModal(v);
			else if (key === 'refresh') this.refresh(v);
			else if (key === 'delete') this.remove(v);
		},
		sizeText(n) { return formatSize(Number(n) || 0); },
		timeText(t) { const d = new Date(t); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }); },
		openVodFiles() { this.vfVisible = true; this.vf = null; this.vfSelected = []; this.loadVodFiles(); },
		async loadVodFiles() {
			this.vfLoading = true;
			try {
				this.vf = await getVodFiles(); // 请求函数直接返回数据本身（已去掉 code/message 外壳）
				// 有孤儿先看孤儿；没有孤儿但有视频找不到文件，先看这一类（这是需要处理的），否则看使用中
				this.vfView = this.vf.orphanCount ? 'orphan' : (this.vf.missingCount ? 'missing' : 'used');
				this.vfSelected = [];
			} catch (e) { notifyError(this, e, '统计云点播文件'); } finally { this.vfLoading = false; }
		},
		confirmDeleteVodFiles() {
			const n = this.vfSelected.length;
			this.$confirm({
				title: `确定从云点播删除这 ${n} 个文件吗？`,
				content: `删除后不能恢复。服务端会再核对一遍，正在被视频使用的、上传不到 ${this.vf ? this.vf.minAgeHours : 1} 小时的会自动跳过。`,
				okText: '删除', okType: 'danger', cancelText: '取消',
				onOk: async () => {
					this.vfDeleting = true;
					try {
						const r = (await deleteVodFiles(this.vfSelected)) || {};
						const parts = [`已删除 ${(r.deleted || []).length} 个`];
						if ((r.skipped || []).length) parts.push(`跳过 ${r.skipped.length} 个（${r.skipped[0].reason}）`);
						if ((r.failed || []).length) parts.push(`失败 ${r.failed.length} 个（${r.failed[0].reason}）`);
						(r.failed || []).length ? this.$message.warning(parts.join('，')) : this.$message.success(parts.join('，'));
						await this.loadVodFiles();
					} catch (e) { notifyError(this, e, '删除云点播文件'); } finally { this.vfDeleting = false; }
				}
			});
		},
		openDetail(v) {
			this.detail = v;
			this.detailVisible = true;
		},
		toggleStats() {
			this.showStats = !this.showStats;
			try { localStorage.setItem('videoStatsOpen', this.showStats ? '1' : '0'); } catch (e) { /* 记不住就算了 */ }
		},
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
.vf-sum { line-height: 1.8; }
.vf-warn { color: #fa8c16; }
.vf-note { margin: 8px 0; color: #8c8c8c; font-size: 12px; line-height: 1.6; }
.vf-tabs { margin: 12px 0 4px; }
.vf-empty { padding: 28px 0; text-align: center; color: #8c8c8c; }
.vf-foot { margin-top: 14px; text-align: right; }
.act-danger { color: #cf1322; }
.dt-card { border: 1px solid #ebeef5; border-radius: 10px; overflow: hidden; }
.dt-head { display: flex; align-items: center; padding: 16px; background: linear-gradient(135deg, #f4f8ff, #fafcff); border-bottom: 1px solid #ebeef5; }
.dt-cover { flex-shrink: 0; width: 192px; height: 108px; border-radius: 8px; object-fit: cover; background: #e9f0fa; box-shadow: 0 2px 8px rgba(22, 119, 255, 0.12); }
.dt-nocover { display: flex; align-items: center; justify-content: center; color: #9db9e6; font-size: 32px; }
.dt-main { flex: 1; min-width: 0; margin-left: 18px; }
.dt-title { font-size: 17px; font-weight: 600; color: #111827; line-height: 1.4; word-break: break-all; }
.dt-path { margin-top: 6px; color: #6b7280; font-size: 13px; }
.dt-sep { margin: 0 6px; color: #bfbfbf; }
.dt-tags { margin-top: 10px; }
.dt-grid { display: grid; grid-template-columns: 90px 1fr; }
.dt-k, .dt-v { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; }
.dt-k:nth-last-child(2), .dt-v:last-child { border-bottom: 0; }
.dt-k { color: #6b7280; background: #fcfcfd; }
.dt-v { background: #fff; word-break: break-all; }
.dt-pre { white-space: pre-wrap; }
.dt-empty { color: #bfbfbf; }
.act-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.stat-toggle .anticon { transition: transform 0.2s; }
.stat-toggle .flip { transform: rotate(180deg); }
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
