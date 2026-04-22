<template>
    <div>
        <!-- 搜索表单 -->
        <div style="margin-bottom: 16px;">
            <a-form layout="inline">
                <a-form-item>
                    <a-input v-model="searchForm.name" placeholder="请输入产品名称" size="small" />
                </a-form-item>
                <a-form-item>
                    <a-select
                        v-model="searchForm.catalogId"
                        placeholder="请选择目录"
                        style="width: 200px"
                        size="small"
                        allowClear
                    >
                        <a-select-option v-for="catalog in catalogs" :key="catalog.id" :value="catalog.id">
                            {{ catalog.name }}
                        </a-select-option>
                    </a-select>
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                    <a-button style="margin-left: 8px" size="small" @click="handleReset">重置</a-button>
                </a-form-item>
            </a-form>
        </div>

        <!-- 新增产品按钮 -->
        <a-button type="primary" icon="plus" size="small" @click="showModal()" style="margin-bottom: 16px;">
            新增产品
        </a-button>

        <!-- 表格组件 -->
        <a-table :columns="columns" :data-source="data" :loading="loading" rowKey="id"
            :pagination="pagination" @change="handleTableChange">
            <template slot="parameters" slot-scope="text, record">
                <div v-if="record.catalog && record.catalog.paramTitles">
                    <div v-for="param in record.catalog.paramTitles" :key="param.id">
                        <strong>{{ param.title }}:</strong> {{ text[param.id] || '-' }}
                    </div>
                </div>
            </template>
            <template slot="catalog" slot-scope="text">
                {{ text ? text.name : '-' }}
            </template>
            <template slot="pdfUrl" slot-scope="text, record">
                <!-- <span v-if="record.fileID">{{ record.fileID }}</span> -->
                <a-button v-if="record.fileID" type="link" @click="handleDownloadPdf(record)">
                    <a-icon type="download" /> 下载PDF
                </a-button>
                <span v-else>-</span>
            </template>
            <span slot="action" slot-scope="text, record">
                <!-- 编辑按钮 -->
                <a-button type="link" size="small" @click="showModal(record)">
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
            </span>
        </a-table>

        <!-- 编辑模态框 -->
        <a-modal :maskClosable="false" :title="modalTitle" :visible="visible" :confirm-loading="confirmLoading"
            @ok="handleOk" @cancel="handleCancel" width="700px"
            :okButtonProps="{ disabled: uploading || confirmLoading }"
        >
            <template v-if="uploading" slot="footer">
                <a-button key="back" @click="handleCancel">取消</a-button>
                <a-button key="submit" type="primary" :loading="true" disabled>
                    文件上传中...
                </a-button>
            </template>
            <a-form :form="form" :hide-required-mark="true">
                <a-form-item label="产品名称" :colon="false">
                    <a-input 
                        v-decorator="[
                            'name', 
                            { 
                                rules: [{ required: true, message: '请输入产品名称!' }],
                                initialValue: currentRecord ? currentRecord.name : ''
                            }
                        ]"
                        placeholder="请输入产品名称" 
                    />
                </a-form-item>
                <a-form-item label="所属目录" :colon="false">
                    <a-select
                        v-decorator="[
                            'catalogId', 
                            { 
                                rules: [{ required: true, message: '请选择所属目录!' }],
                                initialValue: currentRecord ? currentRecord.catalogId : undefined
                            }
                        ]"
                        placeholder="请选择所属目录"
                        @change="handleCatalogChange"
                    >
                        <a-select-option v-for="catalog in catalogs" :key="catalog.id" :value="catalog.id">
                            {{ catalog.name }}
                        </a-select-option>
                    </a-select>
                </a-form-item>
                
                <!-- 动态参数表单 -->
                <div v-if="selectedCatalog">
                    <h3 style="margin-bottom: 16px;">产品参数</h3>
                    <a-form-item
                        v-for="param in selectedCatalog.paramTitles"
                        :key="param.id"
                        :label="param.title"
                        :colon="false"
                    >
                        <a-input
                            v-decorator="[
                                `parameters[${param.id}]`,
                                {
                                    rules: [{ required: true, message: `请输入${param.title}!` }],
                                    initialValue: currentRecord && currentRecord.parameters ? currentRecord.parameters[param.id] : ''
                                }
                            ]"
                            :placeholder="`请输入${param.title}`"
                        />
                    </a-form-item>
                </div>
                
                <a-form-item label="PDF文件" :colon="false">
                    <a-upload
                        name="pdf"
                        :fileList="fileList"
                        :beforeUpload="beforeUpload"
                        :remove="handleRemove"
                        accept=".pdf"
                        :disabled="uploading"
                    >
                        <a-button :disabled="uploading">
                            <a-icon :type="uploading ? 'loading' : 'upload'" /> {{ uploading ? '上传中...' : '上传PDF' }}
                        </a-button>
                    </a-upload>
                    <div v-if="uploadError" style="margin-top: 8px;">
                        <a-alert type="error" :message="uploadError" banner />
                        <a-button type="link" @click="retryUpload" style="padding-left: 0;">
                            <a-icon type="reload" /> 重试上传
                        </a-button>
                    </div>
                    <div style="color: #999; font-size: 12px; margin-top: 5px;">
                        提示：仅支持PDF格式，文件大小不能超过20MB。先上传PDF文件，再提交表单。
                    </div>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script>
import { getProducts, createProduct, getProductById, deleteProduct, getCatalogs, getCatalogById, updateProduct, uploadPdf, deletePdf, getPdfDownloadUrl } from '@/api';

// 定义表格列的配置
const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        width: '10%',
    },
    {
        title: '产品名称',
        dataIndex: 'name',
        width: '20%',
    },
    {
        title: '所属目录',
        dataIndex: 'catalog',
        width: '20%',
        scopedSlots: { customRender: 'catalog' },
    },
    // {
    //     title: '产品参数',
    //     dataIndex: 'parameters',
    //     width: '30%',
    //     scopedSlots: { customRender: 'parameters' },
    // },
    {
        title: 'PDF文档',
        dataIndex: 'pdfUrl',
        width: '25%',
        scopedSlots: { customRender: 'pdfUrl' },
    },
    {
        title: '操作',
        key: 'action',
        scopedSlots: { customRender: 'action' },
    },
];

export default {
    data() {
        return {
            modalTitle: "新增产品",
            data: [],
            loading: false,
            columns,
            visible: false,
            confirmLoading: false,
            form: this.$form.createForm(this),
            currentRecord: null,
            // 搜索表单数据
            searchForm: {
                name: '',
                catalogId: undefined,
            },
            // 目录列表
            catalogs: [],
            // 选中的目录
            selectedCatalog: null,
            // 文件列表
            fileList: [],
            // 上传的文件
            uploadFile: null,
            // 上传的文件URL和fileID
            uploadedFileInfo: null,
            // 文件上传中状态
            uploading: false,
            // 上传错误信息
            uploadError: null,
            // 分页配置
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                pageSizeOptions: ['10', '20', '50', '100'],
            },
        };
    },
    mounted() {
        this.fetchCatalogs();
        this.fetchData();
    },
    methods: {
        // 获取目录列表
        fetchCatalogs() {
            getCatalogs().then(res => {
                this.catalogs = res;
            }).catch(error => {
                this.$message.error('获取目录列表失败: ' + error.message);
            });
        },

        // 搜索方法
        handleSearch() {
            this.pagination.current = 1;  // 搜索时重置到第一页
            this.fetchData();
        },

        // 重置方法
        handleReset() {
            this.searchForm = {
                name: '',
                catalogId: undefined,
            };
            this.pagination.current = 1;  // 重置时回到第一页
            this.fetchData();
        },

        // 表格变化处理（分页、排序）
        handleTableChange(pagination) {
            this.pagination.current = pagination.current;
            this.pagination.pageSize = pagination.pageSize;
            this.fetchData();
        },

        // 获取数据方法
        fetchData() {
            this.loading = true;
            const query = {
                page: this.pagination.current,
                pageSize: this.pagination.pageSize,
            };

            if (this.searchForm.name) {
                query.name = this.searchForm.name;
            }

            if (this.searchForm.catalogId) {
                query.catalogId = this.searchForm.catalogId;
            }

            getProducts(query).then(res => {
                this.loading = false;
                // 支持两种返回格式：{ list, total } 或直接数组
                if (res && res.list !== undefined) {
                    this.data = res.list;
                    this.pagination.total = res.total || 0;
                } else {
                    // 兼容旧格式（直接返回数组）
                    this.data = res || [];
                    this.pagination.total = res ? res.length : 0;
                }
            }).catch(error => {
                this.loading = false;
                this.$message.error('获取数据失败: ' + error.message);
            });
        },

        // 目录变更处理
        handleCatalogChange(value) {
            const catalog = this.catalogs.find(item => item.id === value);
            if (catalog) {
                this.selectedCatalog = catalog;
                // 重置参数表单
                if (catalog.paramTitles && catalog.paramTitles.length > 0) {
                    const parameters = {};
                    catalog.paramTitles.forEach(param => {
                        parameters[param.id] = this.currentRecord && this.currentRecord.parameters ?
                            this.currentRecord.parameters[param.id] || '' : '';
                    });

                    setTimeout(() => {
                        catalog.paramTitles.forEach(param => {
                            this.form.setFieldsValue({
                                [`parameters[${param.id}]`]: parameters[param.id]
                            });
                        });
                    }, 100);
                }
            } else {
                this.selectedCatalog = null;
            }
        },

        // 文件上传前处理
        async beforeUpload(file) {
            console.log('文件信息:', file);
            
            // 检查文件类型
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (!isPDF) {
                this.$message.error('只能上传PDF文件!');
                return false;
            }
            
            // 将限制改为20MB，确保小于服务器限制
            const isLt20M = file.size / 1024 / 1024 < 20;
            if (!isLt20M) {
                this.$message.error('PDF文件大小不能超过20MB!');
                return false;
            }

            // 如果是编辑模式且已有PDF，先删除旧文件
            if (this.currentRecord && this.currentRecord.fileID) {
                try {
                    await this.deletePdfFile(this.currentRecord.fileID);
                    this.$message.success('旧PDF文件已删除');
                } catch (error) {
                    this.$message.error('删除旧PDF文件失败: ' + error.message);
                    return false;
                }
            }
            
            // 清除之前的文件信息
            this.uploadFile = file;
            this.uploadedFileInfo = null;
            
            // 更新文件列表状态为上传中
            this.fileList = [{
                uid: file.uid || '-1',
                name: file.name,
                status: 'uploading',
                percent: 50,
            }];
            
            // 立即上传文件
            this.uploadPdfFile(file);
            return false;
        },

        // 上传PDF文件
        async uploadPdfFile(file) {
            console.log('开始处理文件上传:', file.name);
            this.uploading = true;
            this.uploadError = null; // 清除之前的错误
            
            try {
                // 更新文件状态为获取授权中
                this.fileList = [{
                    uid: file.uid || '-1',
                    name: file.name,
                    status: 'uploading',
                    percent: 30,
                }];
                
                console.log('正在上传文件...');
                // 上传文件
                const result = await uploadPdf(file);
                console.log('文件上传完成, 结果:', result);
                
                // 保存上传结果
                this.uploadedFileInfo = {
                    fileID: result.fileID || '',
                    url: result.url,
                    filename: file.name
                };
                
                // 更新文件状态为已完成
                this.fileList = [{
                    uid: file.uid || '-1',
                    name: file.name,
                    status: 'done',
                    url: result.url,
                }];
                
                this.$message.success('文件上传成功');
            } catch (error) {
                console.error('上传处理错误:', error);
                
                // 更新文件状态为错误
                this.fileList = [{
                    uid: file.uid || '-1',
                    name: file.name,
                    status: 'error',
                }];
                
                // 设置错误信息
                if (error.message.includes('413')) {
                    this.uploadError = '文件太大，超出服务器允许的大小限制。请尝试上传更小的文件（小于20MB）。';
                    this.uploadFile = null;
                } else if (error.message.includes('获取上传授权')) {
                    this.uploadError = error.message;
                } else if (error.message.includes('上传失败')) {
                    this.uploadError = '上传到腾讯云失败: ' + error.message;
                } else if (error.message.includes('缺少必要字段')) {
                    this.uploadError = '服务器返回数据错误: ' + error.message;
                } else {
                    this.uploadError = '文件上传失败: ' + (error.message || '未知错误') + '。请点击重试。';
                }
                
                this.$message.error(this.uploadError);
            } finally {
                this.uploading = false;
            }
        },

        // 删除PDF文件
        async deletePdfFile(fileID) {
            try {
                await deletePdf(fileID);
                return true;
            } catch (error) {
                console.error('删除PDF文件失败:', error);
                throw error;
            }
        },

        // 下载PDF文件
        async handleDownloadPdf(record) {
            try {
                this.$message.loading('正在获取下载链接...', 0);
                const res = await getPdfDownloadUrl(record.fileID);
                console.log('下载链接:', res);
                
                this.$message.destroy();
                
                if (res && res.file_list.length > 0 && res.file_list[0].download_url) {
                    // 打开新窗口下载文件
                    window.open(res.file_list[0].download_url, '_blank');
                } else {
                    this.$message.error('获取下载链接失败');
                }
            } catch (error) {
                console.log('下载失败:', error);
                this.$message.destroy();
                this.$message.error('下载PDF失败: ' + error.message);
            }
        },

        // 移除文件
        async handleRemove() {
            // 优先删除新上传的文件
            if (this.uploadedFileInfo && this.uploadedFileInfo.fileID) {
                try {
                    await this.deletePdfFile(this.uploadedFileInfo.fileID);
                    this.$message.success('PDF文件已删除');
                } catch (error) {
                    this.$message.error('删除PDF文件失败: ' + error.message);
                    return false;
                }
            }
            // 如果没有新上传的文件，检查是否是编辑模式的原始文件
            else if (this.currentRecord && this.currentRecord.fileID) {
                try {
                    await this.deletePdfFile(this.currentRecord.fileID);
                    this.$message.success('PDF文件已删除');
                } catch (error) {
                    this.$message.error('删除PDF文件失败: ' + error.message);
                    return false;
                }
            }

            this.uploadFile = null;
            this.fileList = [];
            this.uploadedFileInfo = null;
            return true;
        },

        // 显示添加或编辑产品的模态框
        showModal(record) {
            this.form.resetFields();
            this.visible = true;
            this.fileList = [];
            this.uploadFile = null;
            this.uploadedFileInfo = null;
            
            if (record) {
                this.modalTitle = "编辑产品";
                this.currentRecord = record;
                
                // 设置基本信息
                this.form.setFieldsValue({
                    name: record.name,
                    catalogId: record.catalogId,
                });
                
                // 触发目录变更
                this.handleCatalogChange(record.catalogId);
                
                // 如果有PDF文件
                if (record.pdfUrl) {
                    this.fileList = [{
                        uid: '-1',
                        name: record.pdfUrl.split('/').pop() || '当前PDF文件',
                        status: 'done',
                        url: record.pdfUrl,
                    }];
                    
                    // 保存文件信息
                    this.uploadedFileInfo = {
                        fileID: record.fileID || '',
                        url: record.pdfUrl,
                        filename: record.pdfUrl.split('/').pop() || '当前PDF文件'
                    };
                }
            } else {
                this.modalTitle = "新增产品";
                this.currentRecord = null;
                this.selectedCatalog = null;
            }
        },

        // 删除产品
        handleDelete(record) {
            this.$confirm({
                title: '是否要删除该产品？',
                content: `当前选中ID是"${record.id}",产品是"${record.name}"`,
                okText: '是',
                okType: 'danger',
                cancelText: '否',
                onOk: () => {
                    deleteProduct(record.id).then(() => {
                        this.$message.success('删除成功');
                        this.fetchData();
                    }).catch((error) => {
                        this.$message.error('删除失败: ' + error.message);
                    });
                },
                onCancel: () => {
                    this.$message.info('取消删除');
                },
            });
        },

        // 确认模态框操作
        handleOk() {
            this.form.validateFields(async (err, values) => {
                if (!err) {
                    this.confirmLoading = true;
                    
                    try {
                        // 处理参数（使用 param.id 作为 key）
                        const parameters = {};
                        if (this.selectedCatalog && this.selectedCatalog.paramTitles) {
                            this.selectedCatalog.paramTitles.forEach(param => {
                                // 直接从 values.parameters 对象中获取值
                                if (values.parameters && values.parameters[param.id] !== undefined) {
                                    parameters[param.id] = values.parameters[param.id];
                                }
                            });
                        }
                        console.log('表单值:', values);
                        console.log('处理后的参数:', parameters);
                        
                        // 检查是否有PDF文件但尚未上传
                        if (this.uploadFile && !this.uploadedFileInfo) {
                            this.$message.warning('PDF文件正在上传中，请等待上传完成后再提交');
                            this.confirmLoading = false;
                            return;
                        }
                        
                        // 准备JSON格式的提交数据
                        const submitData = {
                            name: values.name,
                            catalogId: values.catalogId,
                            parameters: parameters
                        };
                        
                        // 如果有上传的文件信息，添加到提交数据中
                        if (this.uploadedFileInfo) {
                            submitData.pdfUrl = this.uploadedFileInfo.url;
                            submitData.fileID = this.uploadedFileInfo.fileID;
                        }
                        
                        console.log('提交数据:', submitData);
                        
                        if (this.currentRecord) {
                            // 编辑
                            await updateProduct(this.currentRecord.id, submitData);
                            this.$message.success('编辑成功');
                        } else {
                            // 新增
                            await createProduct(submitData);
                            this.$message.success('新增成功');
                        }
                        
                        this.visible = false;
                        this.fetchData();
                    } catch (error) {
                        // 改进错误处理
                        if (error.message.includes('413') || error.message.includes('太大')) {
                            this.$message.error('文件太大，超出服务器允许的大小限制。请尝试上传更小的文件（小于20MB）。');
                        } else {
                            this.$message.error('操作失败: ' + error.message);
                        }
                    } finally {
                        this.confirmLoading = false;
                    }
                }
            });
        },

        // 取消模态框操作
        handleCancel() {
            this.visible = false;
            this.form.resetFields();
            this.currentRecord = null;
            this.selectedCatalog = null;
            this.fileList = [];
            this.uploadFile = null;
            this.uploadedFileInfo = null;
            this.uploadError = null;
        },

        // 重试上传
        retryUpload() {
            if (this.uploadFile) {
                this.uploadPdfFile(this.uploadFile);
            }
        },
    },
    // 在组件销毁时清理资源
    beforeDestroy() {
        // 清除可能的大文件引用
        this.uploadFile = null;
        this.uploadedFileInfo = null;
        this.fileList = [];
    },
};
</script> 