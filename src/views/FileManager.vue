<template>
  <div>
    <!-- 统计 -->
    <a-card class="mb-24" :bordered="false" title="文件管理">
      <a-row :gutter="16">
        <a-col :span="6"><a-statistic title="已登记文件" :value="summary.total" suffix="个" /></a-col>
        <a-col :span="6"><a-statistic title="使用中" :value="summary.used" suffix="个" /></a-col>
        <a-col :span="6"><a-statistic title="未使用" :value="summary.unused" :suffix="'个 / ' + unusedSize" /></a-col>
        <a-col :span="6"><a-statistic title="数据库引用但未登记" :value="summary.unregisteredRefs" suffix="个" /></a-col>
      </a-row>
      <a-alert
        v-if="summary.unregisteredRefs > 0"
        type="info"
        show-icon
        style="margin-top: 16px;"
        message="有正在使用的文件还没登记（登记功能上线前上传的历史文件）"
        description="点击「导入历史文件」，选择在云开发控制台导出的文件列表，即可补全登记。导入只会新增记录，不会改动或删除任何文件。"
      />
      <a-alert
        type="warning"
        show-icon
        style="margin-top: 16px;"
        message="删除文件会同时从云存储中永久删除，无法恢复（云存储没有回收站）"
        description="只有「未使用」且上传超过 24 小时的文件才能删除；文件删除成功后，这里的记录才会一并移除，没有只删记录的入口。"
      />
    </a-card>

    <a-card :bordered="false">
      <!-- 工具栏 -->
      <div style="margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: center;">
        <a-radio-group v-model="status" button-style="solid" @change="onFilterChange" style="margin-right: 16px;">
          <a-radio-button value="all">全部</a-radio-button>
          <a-radio-button value="unused">未使用</a-radio-button>
          <a-radio-button value="used">使用中</a-radio-button>
        </a-radio-group>
        <a-input-search
          v-model="keyword"
          placeholder="搜索文件名"
          allow-clear
          style="width: 240px; margin-right: 16px;"
          @search="onFilterChange"
        />
        <a-button style="margin-right: 16px;" :loading="importing" @click="$refs.importInput.click()">导入历史文件</a-button>
        <input ref="importInput" type="file" accept=".html,.htm,.csv,.txt" style="display: none;" @change="onImportFile" />
        <a-button type="danger" :disabled="!selectedRowKeys.length || deleting" :loading="deleting" @click="confirmDelete(selectedRowKeys)">
          删除选中的 {{ selectedRowKeys.length }} 个文件（约 {{ selectedSize }}）
        </a-button>
      </div>

      <a-table
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
          <a-tag v-if="record.inUse" color="green">使用中</a-tag>
          <a-tag v-else color="orange">未使用</a-tag>
          <div v-for="(u, i) in record.usedBy" :key="i" style="font-size: 12px; color: #888;">
            {{ typeLabel(u.type) }}：{{ u.name }}
          </div>
        </template>
        <template slot="action" slot-scope="text, record">
          <a-button v-if="record.deletable" type="link" size="small" class="text-danger" @click="confirmDelete([record.id])">删除</a-button>
          <span v-else style="color: #bbb;">{{ record.reason }}</span>
        </template>
      </a-table>
    </a-card>

    <!-- 操作结果 -->
    <a-card v-if="result" class="mt-24" :bordered="false" title="上一次删除的结果" style="margin-top: 24px;">
      <a-alert
        :type="result.failed.length || result.rejected.length ? 'warning' : 'success'"
        show-icon
        :message="resultMessage"
      />
      <div v-if="result.failed.length" style="margin-top: 12px;">
        <div style="font-weight: 500;">删除失败（文件和记录都保留）：</div>
        <ul style="padding-left: 18px;"><li v-for="f in result.failed" :key="f.id">{{ f.name }}：{{ f.reason }}</li></ul>
      </div>
      <div v-if="result.rejected.length" style="margin-top: 12px;">
        <div style="font-weight: 500;">被拒绝（没有删除）：</div>
        <ul style="padding-left: 18px;"><li v-for="f in result.rejected" :key="f.id">{{ f.name || ('记录 ' + f.id) }}：{{ f.reason }}</li></ul>
      </div>
    </a-card>
  </div>
</template>

<script>
import { notifyError } from '@/utils/notify';
import { getUploadedFiles, importUploadedFiles, deleteUploadedFiles } from '@/api';
import { parseStorageListing, formatSize, parseSize } from '@/utils/storageListing';

const IMPORT_CHUNK = 1000; // 服务端一次最多导入 2000 个

export default {
  data() {
    return {
      status: 'all',
      keyword: '',
      loading: false,
      importing: false,
      deleting: false,
      list: [],
      summary: { total: 0, used: 0, unused: 0, unusedBytes: 0, unregisteredRefs: 0 },
      pagination: { current: 1, pageSize: 20, total: 0, showTotal: (t) => `共 ${t} 个` },
      selectedRowKeys: [],
      selectedMap: {},
      result: null,
      columns: [
        { title: '文件名（点击打开链接）', dataIndex: 'name', scopedSlots: { customRender: 'name' } },
        { title: '大小', dataIndex: 'size', width: 110, scopedSlots: { customRender: 'size' } },
        { title: '上传时间', dataIndex: 'uploadedAt', width: 170 },
        { title: '状态', key: 'status', width: 230, scopedSlots: { customRender: 'status' } },
        { title: '操作', key: 'action', width: 150, scopedSlots: { customRender: 'action' } }
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
