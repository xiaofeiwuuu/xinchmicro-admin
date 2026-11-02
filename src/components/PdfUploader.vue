<template>
  <div>
    <a-upload
      name="pdf"
      :fileList="fileList"
      :beforeUpload="beforeUpload"
      :showUploadList="{ showRemoveIcon: removable }"
      :remove="handleRemove"
      accept=".pdf"
      :disabled="uploading"
    >
      <a-button :disabled="uploading">
        <a-icon :type="uploading ? 'loading' : 'upload'" /> {{ uploading ? '上传中...' : buttonText }}
      </a-button>
    </a-upload>
    <div v-if="error" style="margin-top: 8px;">
      <a-alert type="error" :message="error" banner />
      <a-button v-if="file" type="link" @click="retry" style="padding-left: 0;">
        <a-icon type="reload" /> 重试上传
      </a-button>
    </div>
  </div>
</template>

<script>
import { uploadPdf, deletePdf } from '@/api';
import { validatePdfFile, uploadErrorMessage } from '@/utils/i18nData';

// 单个 PDF 的上传控件：校验、上传、失败重试、替换时清理本次新传的旧文件。
// value 是当前文件信息 { fileID, url, filename }（没有则为 null），由父组件持有；
// 上传成功或移除时通过 change 事件通知父组件。
export default {
  name: 'PdfUploader',
  props: {
    value: { type: Object, default: null },
    // 记录里原有的文件 ID：不是本次新传的，替换或取消时不能从云存储删除
    originalFileId: { type: String, default: '' },
    // 是否允许移除（移除后保存即清空该文件）
    removable: { type: Boolean, default: false },
    buttonText: { type: String, default: '上传PDF' },
    maxSizeMB: { type: Number, default: 20 }
  },
  data() {
    return {
      uploading: false,
      error: null,
      file: null // 最近一次选择的文件，用于失败后重试
    };
  },
  computed: {
    // 文件列表完全由状态推导，不另存一份
    fileList() {
      const name = this.file ? this.file.name : '';
      if (this.uploading) return [{ uid: '-uploading', name, status: 'uploading', percent: 30 }];
      if (this.error) return [{ uid: '-error', name, status: 'error' }];
      if (this.value) {
        const fallback = (this.value.url || '').split('/').pop() || '当前PDF文件';
        return [{ uid: '-1', name: this.value.filename || fallback, status: 'done', url: this.value.url }];
      }
      return [];
    }
  },
  methods: {
    beforeUpload(file) {
      const problem = validatePdfFile(file, this.maxSizeMB);
      if (problem) {
        this.$message.error(problem);
        return false;
      }
      this.start(file);
      return false; // 不走 antd 自带的上传，由 start 负责
    },

    async start(file) {
      this.file = file;
      this.error = null;
      this.uploading = true;
      this.$emit('uploading', true);
      try {
        const result = await uploadPdf(file);
        // 同一次编辑里先传 A 又换成 B：A 不会再被引用，从云存储清掉
        await this.discardSessionFile();
        this.$emit('change', { fileID: result.fileID || '', url: result.url, filename: file.name });
        this.file = null;
        this.$message.success('文件上传成功');
      } catch (error) {
        this.error = uploadErrorMessage(error);
        // 文件太大重试没有意义
        if ((error && error.message || '').includes('413')) this.file = null;
        this.$message.error(this.error);
      } finally {
        this.uploading = false;
        this.$emit('uploading', false);
      }
    },

    retry() {
      if (this.file) this.start(this.file);
    },

    // 移除当前文件（仅 removable 时）。列表由状态推导，所以这里拦截默认移除，改为通知父组件
    async handleRemove() {
      if (!this.removable) return false;
      await this.discardSessionFile();
      this.error = null;
      this.file = null;
      this.$emit('change', null);
      return false;
    },

    // 当前文件如果是本次编辑新传的（不是记录里原有的），从云存储删除
    async discardSessionFile() {
      const current = this.value && this.value.fileID;
      if (current && current !== this.originalFileId) {
        try {
          await deletePdf(current);
        } catch (error) {
          console.error('清理未保存的 PDF 失败:', error);
        }
      }
    }
  }
};
</script>
