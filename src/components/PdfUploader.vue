<template>
  <div :class="{ 'in-form-row': hideButtonWhenUploaded }">
    <!-- 已有文件且设了 hideButtonWhenUploaded：用一张文件卡片代替 antd 自带的文件列表（那个只有一行小字，选中时整行蓝底，不好看） -->
    <div v-if="showCard" class="pdf-card">
      <a-icon type="file-pdf" class="pdf-card-icon" />
      <a class="pdf-card-name" :href="value.url || undefined" target="_blank" rel="noopener noreferrer" :title="cardName">{{ cardName }}</a>
      <a-tooltip v-if="removable" title="移除这个文件">
        <span class="pdf-card-remove" @click="handleRemove"><a-icon type="delete" /></span>
      </a-tooltip>
    </div>
    <a-upload
      v-else
      name="pdf"
      :fileList="fileList"
      :beforeUpload="beforeUpload"
      :showUploadList="{ showRemoveIcon: removable }"
      :remove="handleRemove"
      :accept="allowImage ? '.pdf,.jpg,.jpeg,.png' : '.pdf'"
      :disabled="uploading"
    >
      <!-- hideButtonWhenUploaded：已经有文件了就藏起上传按钮（要换的话先点文件右边的移除，按钮会再出现）；上传中和上传失败时仍显示，失败要能重选 -->
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
import { validatePdfFile, validateInvoiceFile, uploadErrorMessage } from '@/utils/i18nData';

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
    // 已有文件时隐藏上传按钮（需要同时允许移除，否则没法换文件）
    hideButtonWhenUploaded: { type: Boolean, default: false },
    buttonText: { type: String, default: '上传PDF' },
    // 同时允许图片（JPG、PNG）：发票文件用，其它地方（产品、手册）只收 PDF
    allowImage: { type: Boolean, default: false },
    // 上传用途（决定云存储目录）：发票文件传 'invoice'，不传放产品 PDF 的目录
    kind: { type: String, default: '' },
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
    // 有文件、没在上传、没出错，且要求「有文件就隐藏上传按钮」：显示文件卡片
    showCard() {
      return !!(this.hideButtonWhenUploaded && this.value && !this.uploading && !this.error);
    },
    cardName() {
      if (!this.value) return '';
      return this.value.filename || (this.value.url || '').split('/').pop() || '当前文件';
    },
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
      const problem = this.allowImage ? validateInvoiceFile(file, this.maxSizeMB) : validatePdfFile(file, this.maxSizeMB);
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
        const result = await uploadPdf(file, this.kind || undefined);
        // 同一次编辑里先传 A 又换成 B：A 不会再被引用，从云存储清掉
        await this.discardSessionFile();
        this.$emit('change', { fileID: result.fileID || '', url: result.url, filename: file.name });
        this.file = null;
        this.$message.success('文件上传成功');
      } catch (error) {
        this.error = uploadErrorMessage(error);
        // 文件太大重试没有意义
        if ((error && error.message || '').includes('413')) this.file = null;
        // 请求层（获取上传授权）已经提示过的错误不再重复弹
        if (!(error && error.notified)) this.$message.error(this.error);
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
          // 只是清理云存储里没保存的文件，失败不影响上传结果
        }
      }
    }
  }
};
</script>

<style scoped>
/* 已上传文件的卡片：和输入框一样高（40px）、一样的圆角，左边 PDF 图标，中间文件名（太长省略，点开预览），右边移除 */
/* margin 上下各 4px：表单行里（外层行高 40px）输入框是行内元素，会偏下 4px，卡片留同样的距离才和左边的 label 垂直居中、行高和别的行一致（48px） */
.pdf-card { margin: 4px 0; display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border: 1px solid #d6e4ff; border-radius: 8px; background: #f5f9ff; }
/* 上传按钮在这一行里比 label 的中心低 1px，上移 1px（relative 不影响布局） */
.in-form-row >>> .ant-upload .ant-btn { position: relative; top: -1px; }
.pdf-card-icon { flex: none; font-size: 20px; color: #f5222d; }
.pdf-card-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #262626; }
.pdf-card-name:hover { color: #1890ff; }
.pdf-card-remove { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; color: #8c8c8c; cursor: pointer; }
.pdf-card-remove:hover { background: #ffe9e9; color: #f5222d; }
</style>
