<template>
  <div>
    <!-- 第一步：选择云存储文件清单 -->
    <a-card class="mb-24" :bordered="false" title="孤儿文件清理">
      <a-alert
        type="warning"
        show-icon
        style="margin-bottom: 16px;"
        message="危险操作：删除后无法恢复，云存储没有回收站"
        description="只会删除「数据库里没有任何记录引用」且上传超过 24 小时的文件，并且只处理 web/files 目录。删除前请先预览清单，建议先在云开发控制台下载备份。"
      />
      <div>
        <div style="margin-bottom: 8px;">
          1. 在云开发控制台的存储管理里，把文件列表导出（保存为 HTML 或 CSV），然后选择这个文件：
        </div>
        <input type="file" accept=".html,.htm,.csv,.txt" @change="onFile" />
        <span v-if="fileName" style="margin-left: 12px; color: #666;">
          {{ fileName }}：解析到 {{ files.length }} 个文件
        </span>
        <div v-if="parseError" style="color: #ff4d4f; margin-top: 8px;">{{ parseError }}</div>
      </div>
      <div style="margin-top: 16px;">
        <div style="margin-bottom: 8px;">2. 和数据库对比（实时读取产品、手册、轮播图、公司信息里的文件引用）：</div>
        <a-button type="primary" :disabled="!files.length || deleting" :loading="comparing" @click="compare">
          对比数据库
        </a-button>
      </div>
    </a-card>

    <!-- 第二步：对比结果与预览 -->
    <a-card v-if="report" class="mb-24" :bordered="false" title="对比结果">
      <a-row :gutter="16" style="margin-bottom: 16px;">
        <a-col :span="6"><a-statistic title="清单文件" :value="files.length" /></a-col>
        <a-col :span="6"><a-statistic title="数据库引用" :value="refCount" /></a-col>
        <a-col :span="6"><a-statistic title="疑似孤儿" :value="report.orphans.length" :suffix="'个 / ' + orphanSize" /></a-col>
        <a-col :span="6">
          <a-statistic title="已排除（不处理）" :value="report.tooNew.length + report.foreign.length" suffix="个" />
        </a-col>
      </a-row>

      <a-alert
        v-if="!safety.ok"
        type="error"
        show-icon
        style="margin-bottom: 16px;"
        message="安全检查未通过，已禁止删除"
      >
        <ul slot="description" style="margin: 0; padding-left: 18px;">
          <li v-for="(r, i) in safety.reasons" :key="i">{{ r }}</li>
        </ul>
      </a-alert>
      <a-alert
        v-if="report.missingRefs.length"
        type="warning"
        show-icon
        style="margin-bottom: 16px;"
        :message="`有 ${report.missingRefs.length} 条数据库引用的文件在清单里找不到（文件可能已丢失，或清单不完整）`"
        :description="report.missingRefs.map(shortId).join('、')"
      />
      <a-alert
        v-if="report.tooNew.length || report.foreign.length"
        type="info"
        show-icon
        style="margin-bottom: 16px;"
        :message="`已排除 ${report.tooNew.length} 个上传不足 24 小时或看不出上传时间的文件，${report.foreign.length} 个不在 web/files 目录下的文件`"
      />

      <a-table
        size="small"
        row-key="fileID"
        :columns="columns"
        :data-source="report.orphans"
        :pagination="{ pageSize: 20, showTotal: (t) => `共 ${t} 个` }"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange, getCheckboxProps: () => ({ props: { disabled: !safety.ok } }) }"
      />

      <div style="margin-top: 16px;">
        <a-button type="danger" :disabled="!safety.ok || !selectedRowKeys.length || deleting" :loading="deleting" @click="confirmDelete">
          删除选中的 {{ selectedRowKeys.length }} 个文件（约 {{ selectedSize }}）
        </a-button>
        <span style="margin-left: 12px; color: #999;">取消勾选的文件不会被删除</span>
      </div>
      <a-progress v-if="deleting" :percent="progress" style="margin-top: 12px;" />
    </a-card>

    <!-- 第三步：删除结果 -->
    <a-card v-if="result" :bordered="false" title="删除结果">
      <a-alert
        :type="result.failed.length ? 'warning' : 'success'"
        show-icon
        :message="`成功删除 ${result.deleted} 个文件（${result.deletedSize}）${result.failed.length ? '，' + result.failed.length + ' 个失败' : ''}${result.skipped.length ? '，' + result.skipped.length + ' 个因已被引用而跳过' : ''}`"
      />
      <div v-if="result.failed.length" style="margin-top: 12px;">
        <div style="font-weight: 500;">失败的文件：</div>
        <ul style="padding-left: 18px;">
          <li v-for="f in result.failed" :key="f.fileID">{{ shortId(f.fileID) }}：{{ f.reason }}</li>
        </ul>
      </div>
      <div v-if="result.skipped.length" style="margin-top: 12px;">
        <div style="font-weight: 500;">跳过的文件（删除前重新读取数据库时发现已被引用）：</div>
        <ul style="padding-left: 18px;">
          <li v-for="id in result.skipped" :key="id">{{ shortId(id) }}</li>
        </ul>
      </div>
    </a-card>
  </div>
</template>

<script>
import { notifyError } from '@/utils/notify';
import { getProducts, getManuals, getCarousels, getCompanyInfo, deleteCloudFiles } from '@/api';
import { parseStorageListing, computeOrphans, sanityCheck, formatSize, chunk, pathOf } from '@/utils/orphanFiles';

const PAGE_SIZE = 200;

export default {
  data() {
    return {
      fileName: '',
      files: [],
      parseError: '',
      comparing: false,
      deleting: false,
      progress: 0,
      report: null,
      refCount: 0,
      refsComplete: false,
      selectedRowKeys: [],
      result: null,
      columns: [
        { title: '文件名', dataIndex: 'name' },
        { title: '大小', dataIndex: 'size', width: 120 },
        { title: '上传时间', dataIndex: 'time', width: 180 }
      ]
    };
  },
  computed: {
    safety() {
      if (!this.report) return { ok: false, reasons: [] };
      return sanityCheck({
        fileCount: this.files.length,
        refCount: this.refCount,
        orphanCount: this.report.orphans.length,
        refsComplete: this.refsComplete
      });
    },
    orphanSize() {
      return formatSize((this.report ? this.report.orphans : []).reduce((s, o) => s + o.bytes, 0));
    },
    selectedSize() {
      const keys = new Set(this.selectedRowKeys);
      return formatSize((this.report ? this.report.orphans : []).filter((o) => keys.has(o.fileID)).reduce((s, o) => s + o.bytes, 0));
    }
  },
  methods: {
    shortId: (id) => pathOf(id) || id,
    onSelectChange(keys) {
      this.selectedRowKeys = keys;
    },
    async onFile(e) {
      const file = e.target.files && e.target.files[0];
      this.report = null;
      this.result = null;
      this.files = [];
      this.parseError = '';
      this.fileName = file ? file.name : '';
      if (!file) return;
      try {
        const files = parseStorageListing(await file.text());
        if (!files.length) {
          this.parseError = '没有从这个文件里解析到任何文件记录。请确认是云开发控制台导出的文件列表（需要包含 cloud:// 开头的文件 ID）。';
          return;
        }
        this.files = files;
      } catch (error) {
        this.parseError = '读取文件失败：' + (error.message || error);
      }
    },

    // 从线上实时读取所有"被引用的文件"。任何一步失败或数量对不上都视为不完整
    async loadReferences() {
      const refIds = [];
      let complete = true;

      // 产品：分页读完（中文、英文 PDF）
      let got = 0;
      let total = null;
      for (let page = 1; page <= 100; page++) {
        const res = await getProducts({ page, pageSize: PAGE_SIZE });
        const list = Array.isArray(res) ? res : (res && res.list) || [];
        if (res && typeof res.total === 'number') total = res.total;
        list.forEach((p) => { if (p.fileID) refIds.push(p.fileID); if (p.fileIDEn) refIds.push(p.fileIDEn); });
        got += list.length;
        if (!list.length || (total !== null && got >= total)) break;
      }
      if (total === null || got !== total) complete = false;

      // 手册：lang=all 才包含英文手册（旧版服务端忽略这个参数）
      let mGot = 0;
      let mTotal = null;
      for (let page = 1; page <= 100; page++) {
        const res = await getManuals({ page, pageSize: PAGE_SIZE, lang: 'all' });
        const d = res && res.data !== undefined ? res.data : res;
        const list = Array.isArray(d) ? d : (d && d.list) || [];
        if (d && typeof d.total === 'number') mTotal = d.total;
        list.forEach((m) => { if (m.fileId) refIds.push(m.fileId); });
        mGot += list.length;
        if (!list.length || (mTotal !== null && mGot >= mTotal)) break;
      }
      if (mTotal === null || mGot !== mTotal) complete = false;

      // 轮播图
      const cRes = await getCarousels();
      const cList = (cRes && cRes.data) || [];
      cList.forEach((c) => { if (c.fileID) refIds.push(c.fileID); });

      // 公司信息（Logo、安全手册）
      const coRes = await getCompanyInfo();
      const co = (coRes && coRes.data) || {};
      if (co.logoFileID) refIds.push(co.logoFileID);
      if (co.safetyManualFileID) refIds.push(co.safetyManualFileID);

      return { refIds, complete };
    },

    async compare() {
      this.comparing = true;
      this.result = null;
      try {
        const { refIds, complete } = await this.loadReferences();
        this.refCount = new Set(refIds).size;
        this.refsComplete = complete;
        this.report = computeOrphans({ files: this.files, refIds });
        this.selectedRowKeys = sanityCheck({
          fileCount: this.files.length, refCount: this.refCount, orphanCount: this.report.orphans.length, refsComplete: complete
        }).ok ? this.report.orphans.map((o) => o.fileID) : [];
      } catch (error) {
        this.report = null;
        notifyError(this, error, '读取数据库引用失败，已停止（没有删除任何文件）');
      } finally {
        this.comparing = false;
      }
    },

    confirmDelete() {
      this.$confirm({
        title: '确认永久删除这些文件？',
        content: `将从云存储永久删除 ${this.selectedRowKeys.length} 个文件（约 ${this.selectedSize}），无法恢复。删除前会再次读取数据库，已被引用的文件会自动跳过。`,
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => this.doDelete()
      });
    },

    async doDelete() {
      this.deleting = true;
      this.progress = 0;
      try {
        // 删除前重新读取一遍引用：预览之后如果有人把某个文件绑到了记录上，这里能拦住
        const { refIds, complete } = await this.loadReferences();
        const fresh = computeOrphans({ files: this.files, refIds });
        const check = sanityCheck({
          fileCount: this.files.length, refCount: new Set(refIds).size, orphanCount: fresh.orphans.length, refsComplete: complete
        });
        if (!check.ok) {
          this.$message.error('删除前的安全检查未通过：' + check.reasons.join('；'));
          return;
        }
        const freshIds = new Set(fresh.orphans.map((o) => o.fileID));
        const selected = new Set(this.selectedRowKeys);
        const targets = fresh.orphans.filter((o) => selected.has(o.fileID));
        const skipped = this.selectedRowKeys.filter((id) => !freshIds.has(id));

        const deletedIds = [];
        const failed = [];
        const batches = chunk(targets.map((o) => o.fileID), 50);
        for (let i = 0; i < batches.length; i++) {
          try {
            const res = await deleteCloudFiles(batches[i]);
            const byId = new Map(((res && res.delete_list) || []).map((d) => [d.fileid, d]));
            batches[i].forEach((id) => {
              const d = byId.get(id);
              if (d && d.status === 0) deletedIds.push(id);
              else failed.push({ fileID: id, reason: d ? (d.errmsg || `错误码 ${d.status}`) : '接口没有返回这个文件的结果' });
            });
          } catch (error) {
            batches[i].forEach((id) => failed.push({ fileID: id, reason: error.message || '请求失败' }));
          }
          this.progress = Math.round(((i + 1) / batches.length) * 100);
        }

        const deletedSet = new Set(deletedIds);
        const bytes = targets.filter((o) => deletedSet.has(o.fileID)).reduce((s, o) => s + o.bytes, 0);
        this.result = { deleted: deletedIds.length, deletedSize: formatSize(bytes), failed, skipped };
        // 采用刚刚读到的最新对比结果（已被引用的不再显示为孤儿），并去掉已删除的
        this.files = this.files.filter((f) => !deletedSet.has(f.fileID));
        this.refCount = new Set(refIds).size;
        this.refsComplete = complete;
        this.report = { ...fresh, orphans: fresh.orphans.filter((o) => !deletedSet.has(o.fileID)) };
        const remaining = new Set(this.report.orphans.map((o) => o.fileID));
        this.selectedRowKeys = this.selectedRowKeys.filter((id) => remaining.has(id));
      } catch (error) {
        notifyError(this, error, '删除失败，已停止');
      } finally {
        this.deleting = false;
      }
    }
  }
};
</script>
