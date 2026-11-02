<template>
  <div class="bulk-en">
    <!-- 覆盖情况 -->
    <a-card size="small" title="英文版覆盖情况" style="margin-bottom: 16px;">
      <a-spin :spinning="statsLoading">
        <div v-if="stats" style="display: flex; align-items: center; flex-wrap: wrap;">
          <a-statistic title="产品总数" :value="stats.total" style="margin-right: 40px;" />
          <a-statistic title="已有英文版" :value="stats.withEnFile" style="margin-right: 40px;" />
          <a-statistic title="缺英文版" :value="stats.missingEnFile" style="margin-right: 40px;" />
          <div style="flex: 1; min-width: 240px;">
            <a-progress :percent="coverage" />
          </div>
          <a-button size="small" icon="reload" style="margin-left: 16px;" @click="loadStats">刷新</a-button>
        </div>
        <div v-else style="color: #999;">暂无数据</div>
      </a-spin>
    </a-card>

    <!-- 第一步：选择并上传 -->
    <a-card size="small" title="第一步：选择英文 PDF 并上传" style="margin-bottom: 16px;">
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px;"
        message="文件名格式：产品名_EN.pdf，例如 XC1234_EN.pdf。系统按产品名匹配（不区分大小写）。上传的文件在第二步确认关联之前不会影响线上数据。"
        description="约三成产品名在多个目录里重复。请把英文 PDF 按目录名分文件夹放好（根文件夹/目录名/XC1234_EN.pdf），再用「选择文件夹」上传，系统会用文件夹名识别目录，文件夹名需要与后台的目录名一致。"
      />

      <a-form layout="inline" style="margin-bottom: 12px;">
        <a-form-item>
          <a-upload
            multiple
            accept=".pdf"
            :show-upload-list="false"
            :before-upload="beforeSelect"
            :disabled="busy"
          >
            <a-button icon="plus" :disabled="busy">选择 PDF 文件（可多选）</a-button>
          </a-upload>
        </a-form-item>
        <a-form-item>
          <a-upload
            directory
            accept=".pdf"
            :show-upload-list="false"
            :before-upload="beforeSelect"
            :disabled="busy || !catalogsLoaded"
          >
            <a-button icon="folder-open" :disabled="busy || !catalogsLoaded">选择文件夹（按目录名分文件夹）</a-button>
          </a-upload>
        </a-form-item>
        <a-form-item label="统一限定目录">
          <a-select
            v-model="catalogId"
            placeholder="可选：没有分文件夹的文件都归到这个目录"
            style="width: 280px;"
            allowClear
            :disabled="busy"
            @change="onCatalogChange"
          >
            <a-select-option v-for="catalog in catalogs" :key="catalog.id" :value="catalog.id">
              {{ catalog.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>

      <div v-if="rows.length">
        <div style="margin-bottom: 12px;">
          <a-button type="primary" :disabled="!uploadableCount || busy" :loading="uploading" @click="startUpload">
            {{ uploading ? '上传中…' : `上传 ${uploadableCount} 个文件` }}
          </a-button>
          <a-button v-if="uploading" type="danger" style="margin-left: 8px;" @click="cancelRequested = true">
            停止
          </a-button>
          <a-button style="margin-left: 8px;" :disabled="busy" @click="clearAll">清空列表</a-button>
          <span style="margin-left: 16px; color: #666;">
            共 {{ summary.total }} 个：已上传 {{ summary.done }}，待上传 {{ summary.pending }}，失败 {{ summary.error }}，无法识别 {{ summary.unparsable }}
          </span>
        </div>
        <a-progress v-if="uploading" :percent="uploadPercent" status="active" style="margin-bottom: 12px;" />

        <a-table
          :columns="fileColumns"
          :data-source="rows"
          rowKey="key"
          size="small"
          :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 个文件` }"
        >
          <template slot="parsed" slot-scope="text, row">
            <span v-if="row.parseError" style="color: #f5222d;">{{ row.parseError }}</span>
            <span v-else>{{ row.parsedName }}</span>
          </template>
          <template slot="catalog" slot-scope="text, row">
            <span v-if="row.catalogName">{{ row.catalogName }}</span>
            <span v-else-if="catalogId" style="color: #666;">{{ catalogNameOf(catalogId) }}（统一）</span>
            <a-tooltip v-else-if="row.folderNote" :title="row.folderNote">
              <a-tag color="orange">文件夹未匹配</a-tag>
            </a-tooltip>
            <span v-else style="color: #999;">-</span>
          </template>
          <template slot="status" slot-scope="text, row">
            <a-tag v-if="row.parseError" color="red">无法识别</a-tag>
            <a-tag v-else-if="row.status === 'done'" color="green">已上传</a-tag>
            <a-tag v-else-if="row.status === 'uploading'" color="blue">上传中 {{ row.percent }}%</a-tag>
            <a-tooltip v-else-if="row.status === 'error'" :title="row.error">
              <a-tag color="red">失败</a-tag>
            </a-tooltip>
            <a-tag v-else>待上传</a-tag>
          </template>
          <template slot="action" slot-scope="text, row">
            <a-button type="link" size="small" :disabled="busy" @click="removeRow(row)">移除</a-button>
          </template>
        </a-table>
      </div>
      <div v-else style="color: #999;">还没有选择文件</div>
    </a-card>

    <!-- 第二步：预览并确认 -->
    <a-card size="small" title="第二步：预览匹配结果并确认关联">
      <a-button :disabled="!canPreview" :loading="previewing" @click="preview">预览匹配结果</a-button>
      <span v-if="!summary.done" style="margin-left: 12px; color: #999;">先上传文件</span>

      <div v-if="report" style="margin-top: 16px;">
        <a-alert
          v-if="!reportFresh"
          type="warning"
          show-icon
          style="margin-bottom: 12px;"
          message="文件列表或限定目录已变化，请重新预览"
        />
        <div style="display: flex; flex-wrap: wrap;">
          <a-statistic title="可关联" :value="report.matched" :value-style="{ color: '#3f8600' }" style="margin-right: 40px;" />
          <a-statistic title="需要处理" :value="problems.length" :value-style="{ color: problems.length ? '#cf1322' : '#999' }" />
        </div>

        <div v-if="problems.length" style="margin-top: 16px;">
          <div style="margin-bottom: 8px; font-weight: 500;">这些文件不会被关联：</div>
          <a-table
            :columns="problemColumns"
            :data-source="problems"
            :row-key="(r, i) => i"
            size="small"
            :pagination="{ pageSize: 10 }"
          />
        </div>

        <div style="margin-top: 16px;">
          <a-button type="primary" :disabled="!canCommit" :loading="committing" @click="commit">
            确认关联 {{ report.matched }} 个产品
          </a-button>
          <span style="margin-left: 12px; color: #999;">已有英文版的产品会被替换，旧的英文文件会被删除。</span>
        </div>
      </div>

      <a-alert
        v-if="committed"
        type="success"
        show-icon
        style="margin-top: 16px;"
        :message="`已关联 ${committed.updated} 个产品的英文版`"
      />
    </a-card>
  </div>
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
  summarizeRows,
  coveragePercent
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
      catalogId: undefined,
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
      committed: null,
      fileColumns: [
        { title: '文件', dataIndex: 'path', key: 'path', ellipsis: true },
        { title: '对应的产品名', key: 'parsed', scopedSlots: { customRender: 'parsed' }, width: 220 },
        { title: '目录', key: 'catalog', scopedSlots: { customRender: 'catalog' }, width: 180 },
        { title: '状态', key: 'status', scopedSlots: { customRender: 'status' }, width: 140 },
        { title: '操作', key: 'action', scopedSlots: { customRender: 'action' }, width: 90 }
      ],
      problemColumns: [
        { title: '问题', dataIndex: 'type', key: 'type', width: 110 },
        { title: '文件名', dataIndex: 'fileName', key: 'fileName', ellipsis: true },
        { title: '说明', dataIndex: 'detail', key: 'detail' }
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
    coverage() {
      return coveragePercent(this.stats);
    },
    // 可以上传的：能识别出产品名，且还没上传成功
    uploadableCount() {
      return this.rows.filter((r) => !r.parseError && (r.status === 'pending' || r.status === 'error')).length;
    },
    uploadPercent() {
      return this.uploadTotal ? Math.floor((this.uploadDone / this.uploadTotal) * 100) : 0;
    },
    currentSignature() {
      const uploaded = this.rows.filter((r) => r.status === 'done').map((r) => `${r.path}:${r.fileID}:${r.catalogId || ''}`);
      return JSON.stringify([this.catalogId || null, uploaded]);
    },
    reportFresh() {
      return !!this.report && this.reportSignature === this.currentSignature;
    },
    canPreview() {
      return !this.busy && this.summary.done > 0;
    },
    canCommit() {
      return !this.busy && this.reportFresh && this.report.matched > 0 && !this.committed;
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

    catalogNameOf(id) {
      const found = this.catalogs.find((c) => c.id === id);
      return found ? found.name : '';
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
      this.rows.push({
        key: ++rowSeq,
        file,
        path,
        fileName: file.name,
        catalogId: catalog ? catalog.id : undefined,
        catalogName: catalog ? catalog.name : '',
        folderNote: hasFolder && !catalog ? `文件夹名与后台的任何目录都不一致：${path}` : '',
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

    onCatalogChange() {
      // 限定目录变化后，之前的预览不再有效（reportFresh 会自动变为 false）
    },

    // 上传所有待上传的文件，最多同时 3 个；单个失败不影响其它，可以再次点击重试失败的
    async startUpload() {
      const targets = this.rows.filter((r) => !r.parseError && (r.status === 'pending' || r.status === 'error'));
      if (!targets.length) return;
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
        if (this.cancelRequested) this.$message.info('已停止上传');
        else if (failed) this.$message.warning(`${failed} 个文件上传失败，可以再次点击上传重试`);
        else this.$message.success('全部上传完成');
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
        const report = await bulkLinkEnglishProducts({ dryRun, items: batch });
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
      const { items, fileNames, skipped } = buildBulkItems(entries, { catalogId: this.catalogId });
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
            this.offerCleanup(unmatched);
          } catch (error) {
            // 请求封装已经弹出了错误提示
          } finally {
            this.committing = false;
          }
        }
      });
    },

    // 没有关联上的文件已经上传到云存储，询问是否清理
    offerCleanup(fileIDs) {
      if (!fileIDs.length) return;
      this.$confirm({
        title: `${fileIDs.length} 个文件没有关联到任何产品`,
        content: '是否从云存储中删除这些文件？也可以保留，修正文件名或目录后重新关联。',
        okText: '删除这些文件',
        okType: 'danger',
        cancelText: '保留',
        onOk: async () => {
          await deletePdfs(fileIDs);
          const gone = new Set(fileIDs);
          this.rows = this.rows.filter((r) => !gone.has(r.fileID));
          this.$message.success('已清理');
        }
      });
    }
  }
};
</script>

<style scoped>
.bulk-en {
  padding: 4px;
}
</style>
