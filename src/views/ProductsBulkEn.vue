<template>
  <a-card :bordered="false" class="bulk-en">
    <!-- 概况与说明：只用灰色小字 -->
    <div class="be-summary" v-if="stats">产品共 {{ stats.total }} 个，已有英文版 {{ stats.withEnFile }} 个</div>
    <div class="be-hint">
      文件名写成「产品名_EN.pdf」，例如 XC1234_EN.pdf，按产品名匹配（不区分大小写）。所有文件放在一个文件夹里就行，用「选择文件夹」可以一次选整个文件夹。
      不同目录里的同名产品会共用这一份英文 PDF；如果某个同名产品的文档内容不一样，请把它放进以目录名命名的子文件夹，就只关联那个目录的产品。
      点「确认关联」之前不会影响线上数据。
    </div>

    <!-- 一个主按钮走完流程：上传并检查 → 确认关联 -->
    <div class="be-toolbar">
      <a-upload multiple accept=".pdf" :show-upload-list="false" :before-upload="beforeSelect" :disabled="busy">
        <a-button :disabled="busy">选择文件</a-button>
      </a-upload>
      <a-upload directory accept=".pdf" :show-upload-list="false" :before-upload="beforeSelect" :disabled="busy || !catalogsLoaded">
        <a-button :disabled="busy || !catalogsLoaded">选择文件夹</a-button>
      </a-upload>
      <a-button type="primary" :disabled="!mainEnabled" :loading="previewing || committing" @click="onMain">{{ mainLabel }}</a-button>
      <a v-if="rows.length && !busy" class="be-link" @click="clearAll">清空</a>
    </div>

    <div class="be-status" v-if="statusLine">{{ statusLine }}</div>

    <a-table
      v-if="rows.length"
      :columns="columns"
      :data-source="rows"
      rowKey="key"
      size="small"
      :pagination="{ pageSize: 10, showTotal: (t) => `共 ${t} 个文件` }"
    >
      <template slot="product" slot-scope="text, row">
        <span v-if="row.parseError" class="be-muted">-</span>
        <span v-else>{{ row.parsedName }}<span v-if="row.catalogName" class="be-muted">（{{ row.catalogName }}）</span></span>
      </template>
      <template slot="status" slot-scope="text, row">
        <span class="be-muted">{{ statusText(row) }}</span>
      </template>
      <template slot="action" slot-scope="text, row">
        <a v-if="!busy" @click="removeRow(row)">移除</a>
      </template>
    </a-table>
    <div v-else class="be-muted">还没有选择文件</div>
  </a-card>
</template>

<script>
import { notifyError } from '@/utils/notify';
import {
  getCatalogs,
  getUploadAuth,
  uploadToCosWithProgress,
  bulkLinkEnglishProducts,
  getEnglishStats,
  deletePdfs
} from '@/api';
import {
  parseEnglishPdfName,
  catalogFromPath,
  buildBulkItems,
  chunk,
  runPool,
  mergeBulkReports,
  describeProblems,
  unmatchedFileIDs,
  summarizeRows
} from '@/utils/i18nData';

const UPLOAD_CONCURRENCY = 3;
const BATCH_SIZE = 1000; // 与服务端一次最多处理的条数一致

let rowSeq = 0;

export default {
  name: 'ProductsBulkEn',
  data() {
    return {
      stats: null,
      statsLoading: false,
      catalogs: [],
      catalogsLoaded: false,
      rows: [],
      uploading: false,
      cancelRequested: false,
      uploadDone: 0,
      uploadTotal: 0,
      previewing: false,
      committing: false,
      report: null, // 预览报告（dryRun）
      reportSignature: '', // 生成预览时的文件与目录状态；变化后预览作废
      previewItems: [],
      previewFileNames: [],
      previewSkipped: [],
      notes: {}, // 检查后有问题的文件：路径 → 原因（只显示在状态列里）
      expandedNotes: {}, // 一个文件会关联到多个同名产品的：路径 → 说明
      committed: null,
      columns: [
        { title: '文件', dataIndex: 'path', key: 'path', ellipsis: true },
        { title: '对应产品', key: 'product', scopedSlots: { customRender: 'product' } },
        { title: '状态', key: 'status', scopedSlots: { customRender: 'status' } },
        { title: '', key: 'action', scopedSlots: { customRender: 'action' } }
      ]
    };
  },
  computed: {
    busy() {
      return this.uploading || this.previewing || this.committing;
    },
    summary() {
      return summarizeRows(this.rows);
    },
    // 还需要上传的：能识别出产品名，且还没上传成功
    uploadableCount() {
      return this.rows.filter((r) => !r.parseError && (r.status === 'pending' || r.status === 'error')).length;
    },
    currentSignature() {
      const uploaded = this.rows.filter((r) => r.status === 'done').map((r) => `${r.path}:${r.fileID}:${r.catalogId || ''}`);
      return JSON.stringify(uploaded);
    },
    reportFresh() {
      return !!this.report && this.reportSignature === this.currentSignature;
    },
    canCommit() {
      return !this.busy && this.reportFresh && this.report.matched > 0;
    },
    // 主按钮：上传中 → 停止；检查过且有可关联的 → 确认关联；否则 → 上传并检查
    mainLabel() {
      if (this.uploading) return `停止上传（${this.uploadDone}/${this.uploadTotal}）`;
      if (this.reportFresh) return this.report.matched > 0 ? `确认关联 ${this.report.matched} 个产品` : '没有可关联的文件';
      if (this.uploadableCount) return `上传并检查（${this.uploadableCount}）`;
      return this.summary.done > 0 ? '检查' : '上传并检查'; // 文件都已上传、只差检查时叫「检查」；没选文件时灰着
    },
    mainEnabled() {
      if (this.uploading) return true; // 点击即停止
      if (this.busy) return false;
      if (this.reportFresh) return this.canCommit;
      return this.summary.done > 0 || this.uploadableCount > 0;
    },
    // 一行灰字：当前进度或结果
    statusLine() {
      if (this.uploading) return `正在上传 ${this.uploadDone}/${this.uploadTotal}…`;
      if (this.previewing) return '正在检查…';
      if (this.reportFresh) return `可关联 ${this.report.matched} 个产品，有问题的文件 ${this.problems.length} 个${this.problems.length ? '（原因见下表，这些文件不会被关联）' : ''}`;
      if (this.committed) return `已关联 ${this.committed.updated} 个产品的英文版`;
      return this.rows.length ? `已选择 ${this.summary.total} 个文件` : '';
    },
    problems() {
      return this.report ? describeProblems(this.report, this.previewFileNames, this.previewSkipped) : [];
    }
  },
  mounted() {
    this.loadStats();
    getCatalogs()
      .then((res) => {
        this.catalogs = res || [];
        this.catalogsLoaded = true;
      })
      .catch((error) => notifyError(this, error, '获取目录列表失败'));
  },
  // 离开页面时，已上传但没有关联的文件会变成云存储里的孤儿文件，提示并清理
  beforeRouteLeave(to, from, next) {
    const orphans = this.pendingUploadedFileIDs();
    if (!orphans.length || this.committed) {
      next();
      return;
    }
    this.$confirm({
      title: '还有已上传但没有关联的文件',
      content: `离开后这 ${orphans.length} 个文件会从云存储中清理。确定离开吗？`,
      okText: '清理并离开',
      okType: 'danger',
      cancelText: '留在本页',
      onOk: async () => {
        await deletePdfs(orphans);
        next();
      },
      onCancel: () => next(false)
    });
  },
  methods: {
    async loadStats() {
      this.statsLoading = true;
      try {
        this.stats = await getEnglishStats();
      } catch (error) {
        this.stats = null;
      } finally {
        this.statsLoading = false;
      }
    },

    // 每一行的状态文字（只用文字，不用彩色标签）
    statusText(row) {
      if (row.parseError) return `文件名无法识别：${row.parseError}`;
      if (row.status === 'uploading') return `上传中 ${row.percent}%`;
      if (row.status === 'error') return `上传失败：${row.error}`;
      if (row.status === 'pending') return row.folderNote ? '待上传（子文件夹名与任何目录都不一致，将按产品名匹配所有同名产品）' : '待上传';
      if (this.notes[row.path]) return this.notes[row.path];
      if (!this.reportFresh) return '已上传，待检查';
      return this.expandedNotes[row.path] || '可关联';
    },

    // 主按钮：停止上传 / 上传并检查 / 确认关联
    async onMain() {
      if (this.uploading) {
        this.cancelRequested = true;
        return;
      }
      if (this.reportFresh) {
        this.commit();
        return;
      }
      if (this.uploadableCount) {
        const ok = await this.startUpload();
        if (!ok) return; // 有失败或被停止：不继续检查，可以再点一次重试
      }
      if (this.summary.done > 0) await this.preview();
    },

    // 已上传成功、还没有被关联的文件 ID
    pendingUploadedFileIDs() {
      return this.rows.filter((r) => r.status === 'done' && r.fileID).map((r) => r.fileID);
    },

    // 选择文件：只做登记和文件名解析，不立即上传
    beforeSelect(file) {
      if (!/\.pdf$/i.test(file.name)) {
        this.$message.warning(`${file.name} 不是 PDF 文件，已忽略`);
        return false;
      }
      // 选择文件夹时浏览器会给出相对路径（根文件夹/目录名/文件名）
      const path = file.webkitRelativePath || file.name;
      if (this.rows.some((r) => r.path === path && r.file.size === file.size)) {
        return false; // 同路径同大小，视为重复选择
      }
      const parsed = parseEnglishPdfName(file.name);
      const hasFolder = path !== file.name;
      const catalog = hasFolder ? catalogFromPath(path, this.catalogs) : null;
      // 选择文件夹时 path 形如「所选文件夹/文件」或「所选文件夹/子文件夹/文件」。
      // 所有文件放在同一个文件夹里是最常见的用法，这时文件夹名只是个容器，不需要和目录对上，不能提示。
      // 只有文件在子文件夹里（说明用户想按目录分文件夹），而子文件夹名又对不上任何目录时才提示。
      const nested = path.split(/[\\/]/).filter(Boolean).length >= 3;
      this.rows.push({
        key: ++rowSeq,
        file,
        path,
        fileName: file.name,
        catalogId: catalog ? catalog.id : undefined,
        catalogName: catalog ? catalog.name : '',
        folderNote: nested && !catalog ? `子文件夹名与后台的任何目录都不一致：${path}` : '',
        parsedName: parsed.ok ? parsed.name : '',
        parseError: parsed.ok ? '' : parsed.reason,
        status: 'pending', // pending | uploading | done | error
        percent: 0,
        fileID: '',
        url: '',
        error: ''
      });
      return false;
    },

    // 上传所有待上传的文件，最多同时 3 个；单个失败不影响其它，可以再次点击重试失败的
    async startUpload() {
      const targets = this.rows.filter((r) => !r.parseError && (r.status === 'pending' || r.status === 'error'));
      if (!targets.length) return true;
      this.uploading = true;
      this.cancelRequested = false;
      this.committed = null; // 又有新文件上传，之前的"已关联"结果不再代表当前状态
      this.uploadDone = 0;
      this.uploadTotal = targets.length;
      try {
        const results = await runPool(targets, (row) => this.uploadOne(row), {
          concurrency: UPLOAD_CONCURRENCY,
          onProgress: (done) => {
            this.uploadDone = done;
          },
          shouldStop: () => this.cancelRequested
        });
        const failed = results.filter((r) => r && !r.ok).length;
        if (this.cancelRequested) {
          this.$message.info('已停止上传');
          return false;
        }
        if (failed) {
          this.$message.warning(`${failed} 个文件上传失败，可以再次点击重试`);
          return false;
        }
        return true;
      } finally {
        this.uploading = false;
        this.cancelRequested = false;
      }
    },

    async uploadOne(row) {
      row.status = 'uploading';
      row.percent = 0;
      row.error = '';
      try {
        const authData = await getUploadAuth({ path: row.fileName, size: row.file && row.file.size });
        const result = await uploadToCosWithProgress(row.file, authData, (progress) => {
          row.percent = progress.percent;
        });
        // 保险：两个文件拿到同一个文件 ID，说明云存储路径撞了、后传的覆盖了先传的。
        // 这种情况下不能把它们关联到不同产品，否则会指向同一个错误的 PDF，标记失败让用户重试
        if (this.rows.some((r) => r.key !== row.key && r.fileID && r.fileID === result.fileID)) {
          throw new Error('云存储文件 ID 与另一个文件重复，请重试这个文件');
        }
        row.fileID = result.fileID;
        row.url = result.url;
        row.status = 'done';
        row.percent = 100;
      } catch (error) {
        row.status = 'error';
        row.error = error.message || '上传失败';
        throw error;
      }
    },

    // 移除一行；已经上传的文件同时从云存储清理
    async removeRow(row) {
      const index = this.rows.findIndex((r) => r.key === row.key);
      if (index < 0) return;
      this.rows.splice(index, 1);
      if (row.status === 'done' && row.fileID) await deletePdfs([row.fileID]);
    },

    async clearAll() {
      const orphans = this.pendingUploadedFileIDs();
      this.rows = [];
      this.report = null;
      this.committed = null;
      if (orphans.length) await deletePdfs(orphans);
    },

    // 分批提交给服务端并合并报告
    async submitBatches(items, dryRun) {
      const parts = [];
      let offset = 0;
      for (const batch of chunk(items, BATCH_SIZE)) {
        // duplicates: 'all'：不同目录里的同名产品共用这一份英文文件（它们通常是同一份文档在各目录里各传了一遍）
        const report = await bulkLinkEnglishProducts({ dryRun, duplicates: 'all', items: batch });
        parts.push({ report, offset });
        offset += batch.length;
      }
      return mergeBulkReports(parts);
    },

    // 预览：只匹配，不写入
    async preview() {
      const entries = this.rows
        .filter((r) => r.status === 'done')
        .map((r) => ({ fileName: r.path, fileID: r.fileID, url: r.url, catalogId: r.catalogId }));
      const { items, fileNames, skipped } = buildBulkItems(entries);
      this.previewing = true;
      try {
        // 没有可提交的条目时不请求服务端，直接给出空报告
        const report = items.length
          ? await this.submitBatches(items, true)
          : { total: 0, matched: 0, updated: 0, notFound: [], ambiguous: [], conflicts: [], invalid: [] };
        this.report = report;
        this.previewItems = items;
        this.previewFileNames = fileNames;
        this.previewSkipped = skipped;
        this.reportSignature = this.currentSignature;
        this.notes = {};
        describeProblems(report, fileNames, skipped).forEach((p) => {
          if (p.fileName) this.notes[p.fileName] = `${p.type}：${p.detail}`;
        });
        this.expandedNotes = {};
        ((report && report.expanded) || []).forEach((e) => {
          const name = fileNames[e.index];
          if (name) this.expandedNotes[name] = `可关联（同名产品共 ${e.count} 个，都会关联这个文件）`;
        });
        this.committed = null;
      } catch (error) {
        // 请求封装已经弹出了错误提示
      } finally {
        this.previewing = false;
      }
    },

    // 确认：正式写入
    commit() {
      this.$confirm({
        title: `确认关联 ${this.report.matched} 个产品的英文版？`,
        content: '已有英文版的产品会被替换，旧的英文文件会从云存储删除。',
        okText: '确认关联',
        cancelText: '取消',
        onOk: async () => {
          this.committing = true;
          try {
            const result = await this.submitBatches(this.previewItems, false);
            this.committed = result;
            this.$message.success(`已关联 ${result.updated} 个产品`);
            // 已经关联上的文件不再算"未关联"，从列表中移除，避免离开页面时被误清理
            const linked = new Set(this.previewItems.map((i) => i.fileIDEn));
            const unmatched = unmatchedFileIDs(result, this.previewItems, this.previewSkipped);
            unmatched.forEach((id) => linked.delete(id));
            this.rows = this.rows.filter((r) => !(r.fileID && linked.has(r.fileID)));
            this.loadStats();
            // 没关联上的文件留在表里（带着原因），可以改文件名后重新选择，不用的点「清空」会一并清理云存储
            if (unmatched.length) this.$message.info(`${unmatched.length} 个文件没有关联上，原因见表格`);
          } catch (error) {
            // 请求封装已经弹出了错误提示
          } finally {
            this.committing = false;
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.be-summary { color: rgba(0, 0, 0, 0.65); }
.be-hint { color: rgba(0, 0, 0, 0.45); font-size: 12px; margin: 4px 0 16px; line-height: 1.8; }
.be-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 12px; }
.be-status { color: rgba(0, 0, 0, 0.65); font-size: 13px; margin-bottom: 12px; }
.be-muted { color: rgba(0, 0, 0, 0.45); }
.be-link { color: rgba(0, 0, 0, 0.45); }
</style>
