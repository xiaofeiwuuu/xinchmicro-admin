<template>
	<div class="vod-test">
		<a-card :bordered="false">
			<div class="title">视频上传测试（临时页面，验证云点播用，正式功能做完会删）</div>
			<div class="row">
				<input ref="file" type="file" accept="video/*" :disabled="uploading" @change="onPick" />
				<a-button type="primary" :disabled="!picked || uploading" :loading="uploading" @click="start">上传</a-button>
				<a-button v-if="uploading" @click="cancel">取消</a-button>
			</div>
			<div v-if="picked" class="row hint">{{ picked.name }}（{{ sizeText }}）</div>
			<div v-if="uploading || percent > 0" class="bar"><div class="fill" :style="{ width: percent + '%' }"></div></div>
			<div v-if="uploading || percent > 0" class="row hint">{{ percent }}%　{{ speedText }}</div>
			<div class="row">
				<input v-model.trim="manualId" class="fid" placeholder="已有视频的 fileId，例如 5001834828189200830" />
				<a-button :loading="urlLoading" :disabled="!(manualId || (result && result.fileId))" @click="makeUrl">生成播放地址</a-button>
			</div>
			<div v-if="playUrl" class="row"><span class="k">播放地址</span><span class="v pre">{{ playUrl }}</span></div>
			<div v-if="playUrl" class="row hint">到小程序「视频测试页」粘贴这个地址播放。有效到 {{ expireText }}；转码没完成会提示稍后再试。</div>
			<div v-if="result" class="result">
				<div class="row"><span class="k">fileId</span><span class="v">{{ result.fileId }}</span></div>
				<div class="row"><span class="k">源文件地址</span><span class="v">{{ result.url }}</span></div>
				<div class="row"><a-button :loading="signing" @click="sign">生成播放签名（有效 2 小时）</a-button></div>
				<div v-if="psign" class="row"><span class="k">psign</span><span class="v">{{ psign }}</span></div>
			</div>
		</a-card>
	</div>
</template>

<script>
import VodSdk from 'vod-js-sdk-v6/dist/vod-js-sdk-v6.js';
const TcVod = VodSdk.default || VodSdk.TcVod || VodSdk;
import { getVodUploadSignature, getVodPlaySignature, getVodPlayUrl } from '@/api';
import { notifyError } from '@/utils/notify';

export default {
	name: 'VodTest',
	data() {
		return { picked: null, uploading: false, percent: 0, speed: 0, result: null, signing: false, psign: '', uploader: null, manualId: '', playUrl: '', expireAt: 0, urlLoading: false };
	},
	computed: {
		sizeText() {
			return this.picked ? (this.picked.size / 1024 / 1024).toFixed(1) + ' MB' : '';
		},
		expireText() {
			return this.expireAt ? new Date(this.expireAt).toLocaleTimeString('zh-CN') : '';
		},
		speedText() {
			return this.speed ? (this.speed / 1024 / 1024).toFixed(2) + ' MB/s' : '';
		}
	},
	beforeDestroy() {
		if (this.uploader) this.uploader.cancel();
	},
	methods: {
		onPick(e) {
			this.picked = (e.target.files && e.target.files[0]) || null;
			this.result = null;
			this.psign = '';
			this.percent = 0;
		},
		// 每次要签名（过期了 SDK 会再来要）
		async fetchSignature() {
			const res = await getVodUploadSignature();
			return res.data.signature;
		},
		async start() {
			if (!this.picked || this.uploading) return;
			this.uploading = true;
			this.percent = 0;
			this.result = null;
			this.psign = '';
			try {
				const tcVod = new TcVod({ getSignature: this.fetchSignature, allowReport: false });
				this.uploader = tcVod.upload({ mediaFile: this.picked });
				this.uploader.on('media_progress', (info) => {
					this.percent = Math.floor((info.percent || 0) * 100);
					this.speed = info.speed || 0;
				});
				const done = await this.uploader.done();
				this.percent = 100;
				this.result = { fileId: done.fileId, url: (done.video && done.video.url) || '' };
				this.$message.success('上传完成，转码会在云点播里自动进行');
			} catch (error) {
				if (!(error && /cancel/i.test(String(error.message || error)))) notifyError(this, error, '上传失败');
			} finally {
				this.uploading = false;
				this.uploader = null;
			}
		},
		cancel() {
			if (this.uploader) this.uploader.cancel();
			this.uploading = false;
			this.percent = 0;
		},
		async makeUrl() {
			this.urlLoading = true;
			this.playUrl = '';
			try {
				const res = await getVodPlayUrl(this.manualId || this.result.fileId);
				// 第一行是自动选档的地址，后面每行一档清晰度（小程序测试页能识别「标签 地址」的多行文字）
				this.playUrl = ['自动 ' + res.data.url].concat((res.data.renditions || []).map((r) => `${r.height}p ${r.url}`)).join('\n');
				this.expireAt = res.data.expireAt;
			} catch (error) {
				notifyError(this, error, '生成播放地址失败');
			} finally {
				this.urlLoading = false;
			}
		},
		async sign() {
			this.signing = true;
			try {
				const res = await getVodPlaySignature(this.result.fileId);
				this.psign = res.data.psign;
			} catch (error) {
				notifyError(this, error, '生成播放签名失败');
			} finally {
				this.signing = false;
			}
		}
	}
};
</script>

<style scoped>
.title { font-weight: 600; margin-bottom: 16px; }
.row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.hint { color: #8c8c8c; }
.bar { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.fill { height: 100%; background: #1677ff; transition: width .2s; }
.result { margin-top: 16px; border-top: 1px dashed #e8e8e8; padding-top: 16px; }
.fid { width: 340px; height: 32px; padding: 0 10px; border: 1px solid #d9d9d9; border-radius: 4px; }
.k { color: #8c8c8c; width: 72px; flex: none; }
.v { word-break: break-all; user-select: text; }
.pre { white-space: pre-wrap; }
</style>
