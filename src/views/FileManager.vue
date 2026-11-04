<template>
  <a-card :bordered="false">
    <!-- 概况与提示：只用灰色小字，不用色块 -->
    <div class="fm-summary">
      已登记 {{ summary.total }} 个　使用中 {{ summary.used }} 个　未使用 {{ summary.unused }} 个（{{ unusedSize }}）
      <span v-if="summary.unregisteredRefs > 0">　还有 {{ summary.unregisteredRefs }} 个正在使用的文件未登记，可点「导入历史文件」补全</span>
    </div>
    <div class="fm-hint">
      删除会同时从云存储永久删除，无法恢复；只能删除「未使用」且上传超过 24 小时的文件，文件删除成功后记录才会一并移除。
    </div>

    <!-- 工具栏 -->
    <div class="fm-toolbar">
      <a-radio-group v-model="status" @change="onFilterChange">
        <a-radio-button value="all">全部</a-radio-button>
        <a-radio-button value="unused">未使用</a-radio-button>
        <a-radio-button value="used">使用中</a-radio-button>
      </a-radio-group>
      <a-input-search v-model="keyword" placeholder="搜索文件名" allow-clear style="width: 220px;" @search="onFilterChange" />
      <a-button :loading="importing" @click="$refs.importInput.click()">导入历史文件</a-button>
      <input ref="importInput" type="file" accept=".html,.htm,.csv,.txt" style="display: none;" @change="onImportFile" />
      <a-button :disabled="!selectedRowKeys.length || deleting" :loading="deleting" @click="confirmDelete(selectedRowKeys)">
        删除选中（{{ selectedRowKeys.length }} 个，约 {{ selectedSize }}）
      </a-button>
    </div>

    <a-table :scroll="tableScroll"
      row-key="id"
      size="small"
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
      :row-selection="{ selectedRowKeys, onChange: onSelectChange, getCheckboxProps: checkboxProps }"
      @change="onTableChange"
    >
      <template slot="name" slot-scope="text, record">
        <a :href="record.url" target="_blank" rel="noopener noreferrer" :title="record.url">{{ text }}</a>
      </template>
      <template slot="size" slot-scope="text">{{ text ? formatSize(text) : '-' }}</template>
      <template slot="status" slot-scope="text, record">
        <span>{{ record.inUse ? '使用中' : '未使用' }}</span>
        <span v-for="(u, i) in record.usedBy" :key="i" class="fm-used-by">{{ typeLabel(u.type) }}：{{ u.name }}</span>
      </template>
      <template slot="action" slot-scope="text, record">
        <a v-if="record.deletable" @click="confirmDelete([record.id])">删除</a>
        <span v-else-if="!record.inUse" class="fm-muted">{{ record.reason }}</span>
      </template>
    </a-table>

    <!-- 上一次删除的结果：纯文字 -->
    <div v-if="result" class="fm-result">
      <div>{{ resultMessage }}</div>
      <div v-for="f in result.failed" :key="'f' + f.id" class="fm-muted">删除失败（文件和记录都保留）：{{ f.name }}（{{ f.reason }}）</div>
      <div v-for="f in result.rejected" :key="'r' + f.id" class="fm-muted">已拒绝：{{ f.name || ('记录 ' + f.id) }}（{{ f.reason }}）</div>
    </div>
  </a-card>
</template>

<script>
import { notifyError } from '@/utils/notify';
import { getUploadedFiles, importUploadedFiles, deleteUploadedFiles } from '@/api';
import { parseStorageListing, formatSize, parseSize } from '@/utils/storageListing';

const IMPORT_CHUNK = 1000; // 服务端一次最多导入 2000 个

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
  data() {
    return {
      status: 'all',
      keyword: '',
      loading: false,
      importing: false,
      deleting: false,
      list: [],
      summary: { total: 0, used: 0, unused: 0, unusedBytes: 0, unregisteredRefs: 0 },
      pagination: newPagination({ showTotal: (t) => `共 ${t} 个` }),
      selectedRowKeys: [],
      selectedMap: {},
      result: null,
      columns: [
        { title: '文件名（点击打开链接）', dataIndex: 'name', scopedSlots: { customRender: 'name' } },
        { title: '大小', dataIndex: 'size', scopedSlots: { customRender: 'size' } },
        { title: '上传时间', dataIndex: 'uploadedAt' },
        { title: '状态', key: 'status', scopedSlots: { customRender: 'status' } },
        { title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
      ]
    };
  },
  computed: {
    unusedSize() {
      return formatSize(this.summary.unusedBytes || 0);
    },
    selectedSize() {
      return formatSize(this.selectedRowKeys.reduce((s, id) => s + ((this.selectedMap[id] && this.selectedMap[id].size) || 0), 0));
    },
    resultMessage() {
      const r = this.result;
      return `已删除 ${r.deleted.length} 个文件` + (r.failed.length ? `，${r.failed.length} 个失败` : '') + (r.rejected.length ? `，${r.rejected.length} 个被拒绝` : '');
    }
  },
  created() {
    this.fetchList();
  },
  methods: {
    formatSize,
    typeLabel: (t) => ({ product: '产品', manual: '手册', carousel: '轮播图', company: '公司', live: '线上' }[t] || t),
    checkboxProps(record) {
      return { props: { disabled: !record.deletable } };
    },
    async fetchList() {
      this.loading = true;
      try {
        const res = await getUploadedFiles({
          status: this.status,
          keyword: this.keyword || '',
          page: this.pagination.current,
          pageSize: this.pagination.pageSize
        });
        const d = res.data;
        this.list = d.list;
        this.summary = d.summary;
        this.pagination = { ...this.pagination, total: d.total };
        d.list.forEach((f) => { this.$set(this.selectedMap, f.id, f); });
      } catch (error) {
        notifyError(this, error, '获取文件列表失败');
      } finally {
        this.loading = false;
      }
    },
    onFilterChange() {
      this.pagination = { ...this.pagination, current: 1 };
      this.fetchList();
    },
    onTableChange(p) {
      this.pagination = { ...this.pagination, current: p.current, pageSize: p.pageSize };
      this.fetchList();
    },
    onSelectChange(keys) {
      this.selectedRowKeys = keys;
    },

    confirmDelete(ids) {
      if (!ids.length) return;
      const bytes = ids.reduce((s, id) => s + ((this.selectedMap[id] && this.selectedMap[id].size) || 0), 0);
      this.$confirm({
        title: '确认永久删除这些文件？',
        content: `将从云存储永久删除 ${ids.length} 个文件（约 ${formatSize(bytes)}），无法恢复。服务端会再次检查是否仍在使用，使用中的文件不会被删除。`,
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => this.doDelete(ids)
      });
    },
    async doDelete(ids) {
      this.deleting = true;
      try {
        const res = await deleteUploadedFiles(ids);
        this.result = res.data;
        this.$message[res.data.failed.length || res.data.rejected.length ? 'warning' : 'success'](res.message || '删除完成');
        const gone = new Set(res.data.deleted.map((f) => f.id));
        this.selectedRowKeys = this.selectedRowKeys.filter((id) => !gone.has(id));
        await this.fetchList();
      } catch (error) {
        notifyError(this, error, '删除失败');
      } finally {
        this.deleting = false;
      }
    },

    // 导入历史文件：读取云开发控制台导出的文件清单，登记到文件登记表（只新增，不改动、不删除任何文件）
    onImportFile(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      file.text().then((text) => {
        const files = parseStorageListing(text);
        if (!files.length) {
          this.$message.error('没有从这个文件里解析到任何文件记录。请确认是云开发控制台导出的文件列表（需要包含 cloud:// 开头的文件 ID）。');
          return;
        }
        this.$confirm({
          title: '导入历史文件',
          content: `解析到 ${files.length} 个文件，将登记到文件登记表（已登记的跳过）。这个操作不会改动或删除任何文件。`,
          okText: '导入',
          cancelText: '取消',
          onOk: () => this.doImport(files)
        });
      }).catch((error) => {
        this.$message.error('读取文件失败：' + (error.message || error));
      });
    },
    async doImport(files) {
      this.importing = true;
      const total = { created: 0, existing: 0, invalid: 0 };
      try {
        for (let i = 0; i < files.length; i += IMPORT_CHUNK) {
          const res = await importUploadedFiles(files.slice(i, i + IMPORT_CHUNK).map((f) => ({
            fileID: f.fileID, name: f.name, size: parseSize(f.size) || null, time: f.time
          })));
          total.created += res.data.created;
          total.existing += res.data.existing;
          total.invalid += res.data.invalid;
        }
        this.$message.success(`导入完成：新增 ${total.created} 个，已存在 ${total.existing} 个，无效 ${total.invalid} 个`);
        this.pagination = { ...this.pagination, current: 1 };
        await this.fetchList();
      } catch (error) {
        notifyError(this, error, '导入失败');
      } finally {
        this.importing = false;
      }
    }
  }
};
</script>

<style scoped>
.fm-summary { color: rgba(0, 0, 0, 0.65); }
.fm-hint { color: rgba(0, 0, 0, 0.45); font-size: 12px; margin: 4px 0 16px; }
.fm-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
.fm-used-by { display: block; font-size: 12px; color: rgba(0, 0, 0, 0.45); }
.fm-muted { color: rgba(0, 0, 0, 0.35); }
.fm-result { margin-top: 16px; color: rgba(0, 0, 0, 0.65); font-size: 13px; line-height: 1.8; }
</style>
