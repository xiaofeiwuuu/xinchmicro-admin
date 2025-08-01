<template>
  <div class="manuals-container">
    <!-- 搜索表单 -->
    <div style="margin-bottom: 16px;">
      <a-form layout="inline">
        <a-form-item>
          <a-select v-model="searchForm.type" placeholder="手册类型" style="width: 150px;" allowClear>
            <a-select-option value="product">产品手册</a-select-option>
            <a-select-option value="safety">安全手册</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-input v-model="searchForm.keyword" placeholder="搜索手册名称" style="width: 200px;" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
          <a-button style="margin-left: 8px" size="small" @click="resetSearch">重置</a-button>
        </a-form-item>
      </a-form>
    </div>

    <!-- 新增手册按钮 -->
    <a-button type="primary" icon="plus" size="small" @click="handleAdd" style="margin-bottom: 16px;">
      新增手册
    </a-button>

    <!-- 表格组件 -->
    <a-table 
      :columns="columns" 
      :data-source="manualsList" 
      :loading="loading" 
      rowKey="id"
      :pagination="pagination"
      @change="handleTableChange"
    >
      <template slot="type" slot-scope="text">
        <a-tag v-if="text === 'product'" color="blue">产品手册</a-tag>
        <a-tag v-else-if="text === 'safety'" color="orange">安全手册</a-tag>
        <a-tag v-else color="default">其他</a-tag>
      </template>
      
      <template slot="createdAt" slot-scope="text">
        {{ formatDate(text) }}
      </template>
      
      <template slot="creator" slot-scope="text, record">
        {{ record.creator ? record.creator.username : '-' }}
      </template>
      
      <template slot="action" slot-scope="text, record">
        <!-- 预览按钮 -->
        <a-button type="link" size="small" @click="handlePreview(record)">
          <span>预览</span>
        </a-button>
        <a-divider type="vertical" />
        <!-- 编辑按钮 -->
        <a-button type="link" size="small" @click="handleEdit(record)">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path class="fill-muted"
              d="M13.5858 3.58579C14.3668 2.80474 15.6332 2.80474 16.4142 3.58579C17.1953 4.36683 17.1953 5.63316 16.4142 6.41421L15.6213 7.20711L12.7929 4.37868L13.5858 3.58579Z"
              fill="#111827" />
            <path class="fill-muted"
              d="M11.3787 5.79289L3 14.1716V17H5.82842L14.2071 8.62132L11.3787 5.79289Z" fill="#111827" />
          </svg>
          <span class="text-dark">编辑</span>
        </a-button>
        <a-divider type="vertical" />
        <!-- 删除按钮 -->
        <a-button type="link" size="small" @click="handleDelete(record)">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path class="fill-danger" fill-rule="evenodd" clip-rule="evenodd"
              d="M9 2C8.62123 2 8.27497 2.214 8.10557 2.55279L7.38197 4H4C3.44772 4 3 4.44772 3 5C3 5.55228 3.44772 6 4 6L4 16C4 17.1046 4.89543 18 6 18H14C15.1046 18 16 17.1046 16 16V6C16.5523 6 17 5.55228 17 5C17 4.44772 16.5523 4 16 4H12.618L11.8944 2.55279C11.725 2.214 11.3788 2 11 2H9ZM7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8V14C9 14.5523 8.55228 15 8 15C7.44772 15 7 14.5523 7 14V8ZM12 7C11.4477 7 11 7.44772 11 8V14C11 14.5523 11.4477 15 12 15C12.5523 15 13 14.5523 13 14V8C13 7.44772 12.5523 7 12 7Z"
              fill="#111827" />
          </svg>
          <span class="text-danger">删除</span>
        </a-button>
      </template>
    </a-table>

    <!-- 添加/编辑手册对话框 -->
    <a-modal
      :title="dialogType === 'add' ? '添加手册' : '编辑手册'"
      :visible="dialogVisible"
      :confirm-loading="submitLoading"
      @ok="submitForm"
      @cancel="closeDialog"
      :maskClosable="false"
    >
      <a-form :form="form" layout="vertical">
        <a-form-item label="手册名称" :required="true">
          <a-input
            v-decorator="[
              'name',
              {
                rules: [
                  { required: true, message: '请输入手册名称' },
                  { min: 2, max: 50, message: '长度在 2 到 50 个字符' }
                ],
                initialValue: formData.name
              }
            ]"
            placeholder="请输入手册名称"
          />
        </a-form-item>
        <a-form-item label="手册类型" :required="true">
          <a-select
            v-decorator="[
              'type',
              {
                rules: [{ required: true, message: '请选择手册类型' }],
                initialValue: formData.type || 'product'
              }
            ]"
            placeholder="请选择手册类型"
          >
            <a-select-option value="product">产品手册</a-select-option>
            <a-select-option value="safety">安全手册</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="手册文件" :required="dialogType === 'add'">
          <a-upload
            :file-list="fileList"
            :remove="handleRemove"
            :before-upload="beforeUpload"
            :customRequest="uploadFile"
          >
            <a-button>
              <a-icon type="upload" /> 点击上传
            </a-button>
            <div style="margin-top: 8px; color: #999;">只能上传PDF文件，且不超过10MB</div>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 预览对话框 -->
    <a-modal
      title="手册预览"
      :visible="previewVisible"
      :footer="null"
      width="80%"
      @cancel="closePreview"
    >
      <div v-if="previewUrl" style="height: 70vh;">
        <iframe :src="previewUrl" style="width: 100%; height: 100%; border: none;"></iframe>
      </div>
      <div v-else class="text-center py-5">
        <p>无法预览，请下载后查看</p>
      </div>
      <div style="margin-top: 16px; text-align: right;">
        <a-button @click="closePreview">关闭</a-button>
        <a-button type="primary" @click="downloadFile" style="margin-left: 8px;">下载</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { 
  getManuals, 
  getManualById, 
  createManual, 
  updateManual, 
  deleteManual,
  uploadPdf,
  getPdfDownloadUrl,
  deletePdf
} from '@/api';

export default {
  name: 'Manuals',
  data() {
    return {
      // 表格列定义
      columns: [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
        { title: '手册名称', dataIndex: 'name', key: 'name' },
        { title: '手册类型', dataIndex: 'type', key: 'type', scopedSlots: { customRender: 'type' }, width: 120 },
        { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', scopedSlots: { customRender: 'createdAt' }, width: 180 },
        { title: '创建者', dataIndex: 'creator', key: 'creator', scopedSlots: { customRender: 'creator' }, width: 120 },
        { title: '操作', key: 'action', scopedSlots: { customRender: 'action' }, width: 200 }
      ],
      loading: false,
      submitLoading: false,
      manualsList: [],
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showTotal: total => `共 ${total} 条记录`,
        pageSizeOptions: ['10', '20', '50', '100']
      },
      searchForm: {
        type: undefined,
        keyword: ''
      },
      dialogVisible: false,
      dialogType: 'add', // 'add' 或 'edit'
      form: this.$form.createForm(this),
      formData: {
        name: '',
        type: 'product',
        fileId: '',
        filePath: ''
      },
      fileList: [],
      currentId: null,
      previewVisible: false,
      previewUrl: '',
      currentManual: null
    };
  },
  created() {
    this.fetchManuals();
  },
  methods: {
    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    },
    
    // 获取手册列表
    async fetchManuals() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.current,
          pageSize: this.pagination.pageSize,
          ...this.searchForm
        };
        
        const res = await getManuals(params);
        if (res.code === 0) {
          this.manualsList = res.data.list || [];
          this.pagination.total = res.data.total || 0;
        } else {
          this.$message.error(res.message || '获取手册列表失败');
        }
      } catch (error) {
        console.error('获取手册列表出错:', error);
        this.$message.error('获取手册列表失败');
      } finally {
        this.loading = false;
      }
    },
    
    // 表格变化处理
    handleTableChange(pagination) {
      this.pagination.current = pagination.current;
      this.pagination.pageSize = pagination.pageSize;
      this.fetchManuals();
    },
    
    // 搜索
    handleSearch() {
      this.pagination.current = 1;
      this.fetchManuals();
    },
    
    // 重置搜索
    resetSearch() {
      this.searchForm = {
        type: undefined,
        keyword: ''
      };
      this.pagination.current = 1;
      this.fetchManuals();
    },
    
    // 添加手册
    handleAdd() {
      this.dialogType = 'add';
      this.formData = {
        name: '',
        type: 'product',
        fileId: '',
        filePath: ''
      };
      this.fileList = [];
      this.form = this.$form.createForm(this);
      this.dialogVisible = true;
    },
    
    // 编辑手册
    async handleEdit(record) {
      this.dialogType = 'edit';
      this.currentId = record.id;
      
      try {
        const res = await getManualById(record.id);
        if (res.code === 0) {
          const manual = res.data;
          this.formData = {
            name: manual.name,
            type: manual.type,
            fileId: manual.fileId,
            filePath: manual.filePath
          };
          
          // 设置文件列表
          if (manual.fileId) {
            this.fileList = [{
              uid: '-1',
              name: manual.name + '.pdf',
              status: 'done',
              url: manual.fileId
            }];
          } else {
            this.fileList = [];
          }
          
          this.form = this.$form.createForm(this);
          this.dialogVisible = true;
        } else {
          this.$message.error(res.message || '获取手册详情失败');
        }
      } catch (error) {
        console.error('获取手册详情出错:', error);
        this.$message.error('获取手册详情失败');
      }
    },
    
    // 关闭对话框
    closeDialog() {
      this.dialogVisible = false;
      this.formData = {
        name: '',
        type: 'product',
        fileId: '',
        filePath: ''
      };
      this.fileList = [];
      this.currentId = null;
    },
    
    // 删除手册
    handleDelete(record) {
      this.$confirm({
        title: '确定要删除该手册吗？',
        content: '删除后将无法恢复',
        okText: '确定',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            const res = await deleteManual(record.id);
            if (res.code === 0) {
              this.$message.success('删除成功');
              // 如果有文件ID，同时删除文件
              if (record.fileId) {
                try {
                  await deletePdf(record.fileId);
                } catch (error) {
                  console.error('删除文件出错:', error);
                }
              }
              this.fetchManuals();
            } else {
              this.$message.error(res.message || '删除失败');
            }
          } catch (error) {
            console.error('删除手册出错:', error);
            this.$message.error('删除失败');
          }
        }
      });
    },
    
    // 预览手册
    async handlePreview(record) {
      this.currentManual = record;
      this.previewVisible = true;
      this.previewUrl = '';
      
      if (record.fileId) {
        try {
          const res = await getPdfDownloadUrl(record.fileId);
          if (res.code === 0 && res.data.file_list && res.data.file_list.length > 0) {
            const fileInfo = res.data.file_list[0];
            if (fileInfo.status === 0) {
              this.previewUrl = fileInfo.download_url;
            }
          }
        } catch (error) {
          console.error('获取预览链接出错:', error);
        }
      }
    },
    
    // 关闭预览
    closePreview() {
      this.previewVisible = false;
      this.previewUrl = '';
      this.currentManual = null;
    },
    
    // 下载文件
    downloadFile() {
      if (this.previewUrl) {
        window.open(this.previewUrl, '_blank');
      }
    },
    
    // 上传前检查
    beforeUpload(file) {
      const isPDF = file.type === 'application/pdf';
      const isLt10M = file.size / 1024 / 1024 < 10;
      
      if (!isPDF) {
        this.$message.error('只能上传PDF文件!');
        return false;
      }
      
      if (!isLt10M) {
        this.$message.error('文件大小不能超过10MB!');
        return false;
      }
      
      return true;
    },
    
    // 上传文件
    async uploadFile(options) {
      const file = options.file;
      try {
        const res = await uploadPdf(file);
        this.formData.fileId = res.fileID;
        this.formData.filePath = res.filename || file.name;
        this.fileList = [{
          uid: '-1',
          name: file.name,
          status: 'done',
          url: res.url
        }];
        this.$message.success('文件上传成功');
        if (options.onSuccess) {
          options.onSuccess(res);
        }
      } catch (error) {
        console.error('上传文件出错:', error);
        this.$message.error('文件上传失败');
        if (options.onError) {
          options.onError(error);
        }
      }
    },
    
    // 移除文件
    handleRemove() {
      this.formData.fileId = '';
      this.formData.filePath = '';
      this.fileList = [];
      return true;
    },
    
    // 提交表单
    submitForm() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          // 检查是否上传了文件
          if (!this.formData.fileId && this.dialogType === 'add') {
            this.$message.error('请上传手册文件');
            return;
          }
          
          const data = {
            name: values.name,
            type: values.type,
            fileId: this.formData.fileId,
            filePath: this.formData.filePath
          };
          
          this.submitLoading = true;
          try {
            let res;
            if (this.dialogType === 'add') {
              res = await createManual(data);
            } else {
              res = await updateManual(this.currentId, data);
            }
            
            if (res.code === 0) {
              this.$message.success(this.dialogType === 'add' ? '添加成功' : '更新成功');
              this.dialogVisible = false;
              this.fetchManuals();
            } else {
              this.$message.error(res.message || (this.dialogType === 'add' ? '添加失败' : '更新失败'));
            }
          } catch (error) {
            console.error(this.dialogType === 'add' ? '添加手册出错:' : '更新手册出错:', error);
            this.$message.error(this.dialogType === 'add' ? '添加失败' : '更新失败');
          } finally {
            this.submitLoading = false;
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.manuals-container {
  padding: 20px;
}
</style> 