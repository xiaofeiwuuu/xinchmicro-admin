<template>
  <div class="image-picker">
    <a-upload :showUploadList="false" :beforeUpload="beforeUpload" accept="image/jpeg,image/png,image/webp" :disabled="uploading">
      <a-button size="small" :disabled="uploading">
        <a-icon :type="uploading ? 'loading' : 'upload'" /> {{ uploading ? '上传中...' : value ? '重新选择' : buttonText }}
      </a-button>
    </a-upload>
    <!-- 选好后的缩略图：用本机的预览地址，云存储是私有的，直接用云存储链接会打不开 -->
    <img v-if="value && value.preview" class="ip-thumb" :src="value.preview" alt="" />
    <span v-if="value" class="ip-name">{{ value.filename }}</span>
    <a v-if="value && !uploading" class="ip-remove" @click="remove">移除</a>
    <div v-if="error" class="ip-error">{{ error }}</div>
  </div>
</template>

<script>
import { uploadFile, deletePdf } from '@/api';
import { uploadErrorMessage } from '@/utils/i18nData';

// 单张图片的上传控件（发货凭证等）：校验类型和大小、上传、重选时清掉本次新传的旧文件。
// value 是 { fileID, url, filename } 或 null，由父组件持有，上传成功/移除时通过 change 通知。
export default {
  name: 'ImagePicker',
  // 组件触发的是 change 事件，不是 v-model 默认的 input：不声明的话 v-model 永远收不到上传结果，
  // 页面上看不到图片，点「确定」时拿不到文件 ID（会提示「请先选择图片」）
  model: { prop: 'value', event: 'change' },
  props: {
    value: { type: Object, default: null },
    buttonText: { type: String, default: '选择图片' },
    // 上传用途（决定云存储目录）：发货凭证传 'ship-photo'
    kind: { type: String, default: '' },
    maxSizeMB: { type: Number, default: 10 }
  },
  data() {
    return { uploading: false, error: '', preview: '' };
  },
  beforeDestroy() {
    this.revokePreview();
  },
  methods: {
    beforeUpload(file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type || '')) {
        this.$message.error('只能上传 jpg、png、webp 图片');
        return false;
      }
      if (file.size / 1024 / 1024 >= this.maxSizeMB) {
        this.$message.error(`图片不能超过 ${this.maxSizeMB}MB`);
        return false;
      }
      this.start(file);
      return false;
    },
    async start(file) {
      this.error = '';
      this.uploading = true;
      this.$emit('uploading', true);
      try {
        const result = await uploadFile(file, this.kind || undefined);
        await this.discardCurrent();
        this.revokePreview();
        this.preview = URL.createObjectURL(file);
        this.$emit('change', { fileID: result.fileID || '', url: result.url, filename: file.name, preview: this.preview });
      } catch (error) {
        this.error = uploadErrorMessage(error);
        if (!(error && error.notified)) this.$message.error(this.error);
      } finally {
        this.uploading = false;
        this.$emit('uploading', false);
      }
    },
    async remove() {
      await this.discardCurrent();
      this.revokePreview();
      this.$emit('change', null);
    },
    revokePreview() {
      if (this.preview) {
        URL.revokeObjectURL(this.preview);
        this.preview = '';
      }
    },
    // 当前这张是本次新传、还没保存的：从云存储删掉（子账号没有删除权限时 deletePdf 会直接跳过，留在文件管理里由主账号清理）
    async discardCurrent() {
      const id = this.value && this.value.fileID;
      if (id) {
        try { await deletePdf(id); } catch (e) { /* 清理失败不影响上传结果 */ }
      }
    }
  }
};
</script>

<style scoped>
.image-picker { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.ip-thumb { width: 56px; height: 56px; object-fit: cover; border-radius: 4px; border: 1px solid #f0f0f0; }
.ip-name { color: #595959; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ip-remove { color: #8c8c8c; }
.ip-error { width: 100%; color: #f5222d; font-size: 12px; }
</style>
