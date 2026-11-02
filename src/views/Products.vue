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
                    <a-select
                        v-model="searchForm.enFile"
                        placeholder="英文版"
                        style="width: 130px"
                        size="small"
                        allowClear
                    >
                        <a-select-option value="has">已有英文版</a-select-option>
                        <a-select-option value="missing">缺英文版</a-select-option>
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
        <a-button icon="cloud-upload" size="small" @click="$router.push('/products/bulk-en')" style="margin-bottom: 16px; margin-left: 8px;">
            批量关联英文PDF
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
            <template slot="name" slot-scope="text, record">
                {{ text }}
                <div v-if="record.nameEn" style="color: #999; font-size: 12px;">{{ record.nameEn }}</div>
            </template>
            <template slot="catalog" slot-scope="text">
                {{ text ? text.name : '-' }}
            </template>
            <template slot="pdfUrl" slot-scope="text, record">
                <div>
                    <a-button v-if="record.fileID" type="link" @click="handleDownloadPdf(record)">
                        <a-icon type="download" /> 中文版
                    </a-button>
                    <span v-else>-</span>
                </div>
                <div>
                    <a-button v-if="record.fileIDEn" type="link" @click="handleDownloadPdf(record, 'en')">
                        <a-icon type="download" /> 英文版
                    </a-button>
                    <a-tag v-else color="orange">缺英文版</a-tag>
                </div>
            </template>
            <span slot="action" slot-scope="text, record">
                <!-- 编辑按钮 -->
                <a-button type="link" size="small" @click="showModal(record)">
                    <icon-edit />
                    <span class="text-dark">编辑</span>
                </a-button>
                <a-divider type="vertical" />
                <!-- 删除按钮 -->
                <a-button type="link" size="small" @click="handleDelete(record)">
                    <icon-delete />
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
                <a-form-item label="英文名称" :colon="false">
                    <a-input
                        v-decorator="[
                            'nameEn',
                            {
                                rules: [{ max: 100, message: '最多 100 个字符' }],
                                initialValue: currentRecord ? currentRecord.nameEn : ''
                            }
                        ]"
                        placeholder="可选；没有填写时英文界面显示产品名称"
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
                
                <a-form-item label="排序" :colon="false">
                    <a-input-number
                        v-decorator="[
                            'sort',
                            {
                                rules: [{ required: true, message: '请输入排序值!' }],
                                initialValue: currentRecord ? currentRecord.sort : 999
                            }
                        ]"
                        :min="0"
                        :precision="0"
                        placeholder="数字越小越靠前"
                        style="width: 100%;"
                    />
                    <div style="color: #999; font-size: 12px; margin-top: 5px;">
                        提示：数字越小越靠前，相同则按创建时间倒序
                    </div>
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
                
                <a-form-item label="PDF文件（中文）" :colon="false">
                    <pdf-uploader
                        :value="uploadedFileInfo"
                        :original-file-id="currentRecord && currentRecord.fileID ? currentRecord.fileID : ''"
                        button-text="上传PDF"
                        @change="onZhPdfChange"
                        @uploading="uploadingZh = $event"
                    />
                    <div style="color: #999; font-size: 12px; margin-top: 5px;">
                        提示：仅支持PDF格式，文件大小不能超过20MB。先上传PDF文件，再提交表单。
                    </div>
                </a-form-item>
                <a-form-item label="PDF文件（英文）" :colon="false">
                    <pdf-uploader
                        :value="uploadedFileInfoEn"
                        :original-file-id="currentRecord && currentRecord.fileIDEn ? currentRecord.fileIDEn : ''"
                        removable
                        button-text="上传英文PDF"
                        @change="onEnPdfChange"
                        @uploading="uploadingEn = $event"
                    />
                    <div style="color: #999; font-size: 12px; margin-top: 5px;">
                        可选。没有英文版时，小程序切换到英文后会显示中文版 PDF。需要批量关联请使用「批量关联英文PDF」。
                    </div>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script>
import IconEdit from '@/components/IconEdit.vue';
import IconDelete from '@/components/IconDelete.vue';
import { notifyError } from '@/utils/notify';
import { getProducts, createProduct, deleteProduct, getCatalogs, updateProduct, deletePdfs, getPdfDownloadUrl } from '@/api';
import PdfUploader from '@/components/PdfUploader.vue';
import { buildProductQuery, orphanFileIDs } from '@/utils/i18nData';

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
        scopedSlots: { customRender: 'name' },
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
        width: '20%',
        scopedSlots: { customRender: 'pdfUrl' },
    },
    {
        title: '排序',
        dataIndex: 'sort',
        width: '8%',
        sorter: (a, b) => (a.sort || 0) - (b.sort || 0),
    },
    {
        title: '操作',
        key: 'action',
        scopedSlots: { customRender: 'action' },
    },
];

export default {
    components: { PdfUploader, IconEdit, IconDelete },
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
                enFile: undefined,
            },
            // 目录列表
            catalogs: [],
            // 选中的目录
            selectedCatalog: null,
            // 中文 / 英文 PDF 的文件信息 { fileID, url, filename }（没有则为 null）
            uploadedFileInfo: null,
            uploadedFileInfoEn: null,
            // 两个上传控件各自的上传中状态
            uploadingZh: false,
            uploadingEn: false,
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
    computed: {
        // 任意一个 PDF 正在上传
        uploading() {
            return this.uploadingZh || this.uploadingEn;
        },
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
                notifyError(this, error, '获取目录列表失败');
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
                enFile: undefined,
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
            const query = buildProductQuery({
                page: this.pagination.current,
                pageSize: this.pagination.pageSize,
                ...this.searchForm,
            });

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
                notifyError(this, error, '获取数据失败');
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

        // 上传控件的结果：新上传成功时为文件信息；英文版被移除时为 null
        onZhPdfChange(info) {
            this.uploadedFileInfo = info;
        },
        onEnPdfChange(info) {
            this.uploadedFileInfoEn = info;
        },

        // 下载PDF文件（lang 为 'en' 时下载英文版）
        async handleDownloadPdf(record, lang) {
            const fileID = lang === 'en' ? record.fileIDEn : record.fileID;
            try {
                this.$message.loading('正在获取下载链接...', 0);
                const res = await getPdfDownloadUrl(fileID);

                this.$message.destroy();

                if (res && res.file_list.length > 0 && res.file_list[0].download_url) {
                    // 打开新窗口下载文件
                    window.open(res.file_list[0].download_url, '_blank');
                } else {
                    this.$message.error('获取下载链接失败');
                }
            } catch (error) {
                this.$message.destroy();
                notifyError(this, error, '下载PDF失败');
            }
        },

        // 显示添加或编辑产品的模态框
        showModal(record) {
            this.form.resetFields();
            this.visible = true;
            this.uploadedFileInfo = null;
            this.uploadedFileInfoEn = null;
            this.uploadingZh = false;
            this.uploadingEn = false;

            if (record) {
                this.modalTitle = "编辑产品";
                this.currentRecord = record;

                // 设置基本信息
                this.form.setFieldsValue({
                    name: record.name,
                    nameEn: record.nameEn || '',
                    catalogId: record.catalogId,
                    sort: record.sort != null ? record.sort : 999,
                });

                // 触发目录变更
                this.handleCatalogChange(record.catalogId);

                // 如果有 PDF 文件，作为当前文件展示
                if (record.pdfUrl) {
                    this.uploadedFileInfo = {
                        fileID: record.fileID || '',
                        url: record.pdfUrl,
                        filename: record.pdfUrl.split('/').pop() || '当前PDF文件'
                    };
                }
                if (record.fileIDEn) {
                    this.uploadedFileInfoEn = {
                        fileID: record.fileIDEn,
                        url: record.pdfUrlEn || '',
                        filename: (record.pdfUrlEn || '').split('/').pop() || '当前英文PDF文件'
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
                        notifyError(this, error, '删除失败');
                    });
                },
                onCancel: () => {
                    this.$message.info('取消删除');
                },
            });
        },

        // 提交的英文 PDF 字段：有文件 → 写入；原来有、现在被移除 → 明确清空；其它情况不带这两个字段
        buildEnglishPdfFields() {
            if (this.uploadedFileInfoEn) {
                return { pdfUrlEn: this.uploadedFileInfoEn.url, fileIDEn: this.uploadedFileInfoEn.fileID };
            }
            if (this.currentRecord && this.currentRecord.fileIDEn) {
                return { pdfUrlEn: null, fileIDEn: null };
            }
            return {};
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

                        // PDF 还在上传时不能提交
                        if (this.uploading) {
                            this.$message.warning('PDF文件正在上传中，请等待上传完成后再提交');
                            this.confirmLoading = false;
                            return;
                        }

                        // 准备JSON格式的提交数据
                        const submitData = {
                            name: values.name,
                            nameEn: values.nameEn || '',
                            catalogId: values.catalogId,
                            sort: values.sort,
                            parameters: parameters,
                            ...this.buildEnglishPdfFields(),
                        };

                        // 如果有上传的中文文件信息，添加到提交数据中
                        if (this.uploadedFileInfo) {
                            submitData.pdfUrl = this.uploadedFileInfo.url;
                            submitData.fileID = this.uploadedFileInfo.fileID;
                        }

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
                            notifyError(this, error, '文件太大，超出服务器允许的大小限制。请尝试上传更小的文件（小于20MB）。');
                        } else {
                            notifyError(this, error, '操作失败');
                        }
                    } finally {
                        this.confirmLoading = false;
                    }
                }
            });
        },

        // 取消模态框操作
        async handleCancel() {
            // 清理孤儿文件：本次会话刚上传但未保存的 PDF（中英文都要处理）。
            // 记录里原有的文件不能删。
            const original = this.currentRecord ? [this.currentRecord.fileID, this.currentRecord.fileIDEn] : [];
            const orphans = orphanFileIDs([this.uploadedFileInfo, this.uploadedFileInfoEn], original);
            if (orphans.length) {
                await deletePdfs(orphans);
            }

            this.visible = false;
            this.form.resetFields();
            this.currentRecord = null;
            this.selectedCatalog = null;
            this.uploadedFileInfo = null;
            this.uploadedFileInfoEn = null;
        },
    },
    // 在组件销毁时清理资源
    beforeDestroy() {
        this.uploadedFileInfo = null;
        this.uploadedFileInfoEn = null;
    },
};
</script> 