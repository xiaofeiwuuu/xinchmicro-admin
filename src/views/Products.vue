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
        <a-table :scroll="tableScroll" :rowClassName="(r) => (r.id === focusId ? 'row-focus' : '')" :columns="columns" :data-source="data" :loading="loading" rowKey="id"
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
                    <a v-if="record.fileID" :href="fileHref(record.fileID, record.pdfUrl)" target="_blank" rel="noopener noreferrer">中文版</a>
                    <span v-else>-</span>
                </div>
                <div>
                    <a v-if="record.fileIDEn" :href="fileHref(record.fileIDEn, record.pdfUrlEn)" target="_blank" rel="noopener noreferrer">英文版</a>
                    <a-tag v-else color="orange">缺英文版</a-tag>
                </div>
            </template>
            <span slot="action" slot-scope="text, record" class="row-actions">
                <!-- 详情按钮：只看，不改 -->
                <a-button type="link" size="small" @click="openDetail(record)">
                    <a-icon type="eye" />
                    <span class="text-dark">详情</span>
                </a-button>
                <!-- 编辑按钮 -->
                <a-button type="link" size="small" @click="showModal(record)">
                    <icon-edit />
                    <span class="text-dark">编辑</span>
                </a-button>
                <!-- 去价格库存页：带上产品名和目录，在那边定位到这个产品 -->
                <a-button type="link" size="small" @click="goShopProduct(record)">
                    <icon-price />
                    <span class="text-dark">价格库存</span>
                </a-button>
                <!-- 删除按钮 -->
                <a-button type="link" size="small" @click="handleDelete(record)">
                    <icon-delete />
                    <span class="text-danger">删除</span>
                </a-button>
            </span>
        </a-table>

        <!-- 编辑模态框 -->
        <!-- 产品详情：左边基本信息和资料文件，右边参数（只看，修改请点「编辑」） -->
        <a-modal v-model="detailVisible" :title="detailRecord ? detailRecord.name : '产品详情'" :footer="null" :width="960" :destroyOnClose="true" :bodyStyle="{ maxHeight: '72vh', overflowY: 'auto' }">
            <div v-if="detailRecord" class="pd-cols">
                <div class="pd-col">
                    <div class="pd-title">基本信息</div>
                    <div class="pd-grid">
                        <div class="pd-k">产品名称</div><div class="pd-v">{{ detailRecord.name }}</div>
                        <div class="pd-k">所属分类</div><div class="pd-v">{{ detailRecord.catalog && detailRecord.catalog.category ? detailRecord.catalog.category.name : '-' }}</div>
                        <div class="pd-k">所属目录</div><div class="pd-v">{{ detailRecord.catalog ? detailRecord.catalog.name : '-' }}</div>
                        <div class="pd-k">排序</div><div class="pd-v">{{ detailRecord.sort }}</div>
                        <div class="pd-k">创建时间</div><div class="pd-v">{{ detailRecord.createdAt || '-' }}</div>
                        <div class="pd-k">修改时间</div><div class="pd-v">{{ detailRecord.updatedAt || '-' }}</div>
                    </div>

                    <div class="pd-title">资料文件（PDF）</div>
                    <div class="pd-grid">
                        <div class="pd-k">中文版</div>
                        <div class="pd-v"><a v-if="detailRecord.fileID" :href="fileHref(detailRecord.fileID, detailRecord.pdfUrl)" target="_blank" rel="noopener noreferrer">查看 / 下载</a><span v-else class="pd-empty">未上传</span></div>
                        <div class="pd-k">英文版</div>
                        <div class="pd-v"><a v-if="detailRecord.fileIDEn" :href="fileHref(detailRecord.fileIDEn, detailRecord.pdfUrlEn)" target="_blank" rel="noopener noreferrer">查看 / 下载</a><span v-else class="pd-empty">未上传</span></div>
                    </div>
                </div>
                <div class="pd-col">
                    <div class="pd-title">产品参数</div>
                    <div v-if="!detailParams.length" class="pd-empty">这个目录没有设置参数</div>
                    <div v-else class="pd-grid">
                        <template v-for="p in detailParams">
                            <div :key="p.id + 'k'" class="pd-k">{{ p.title }}</div>
                            <div :key="p.id + 'v'" class="pd-v">{{ p.value || '-' }}</div>
                        </template>
                    </div>
                </div>
            </div>
            <div class="pd-foot">
                <span></span>
                <a-button type="primary" size="small" @click="editFromDetail">编辑这个产品</a-button>
            </div>
        </a-modal>

        <a-modal :maskClosable="false" :title="modalTitle" :visible="visible" :confirm-loading="confirmLoading"
            @ok="handleOk" @cancel="handleCancel" width="980px"
            :okButtonProps="{ disabled: uploading || confirmLoading }"
        >
            <template v-if="uploading" slot="footer">
                <a-button key="back" @click="handleCancel">取消</a-button>
                <a-button key="submit" type="primary" :loading="true" disabled>
                    文件上传中...
                </a-button>
            </template>
            <a-form :form="form" :hide-required-mark="true">
                <a-row :gutter="32">
                    <!-- 左：基本信息与 PDF -->
                    <a-col :span="10">
                        <a-form-item label="产品名称" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
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
                        <a-form-item label="英文名称" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
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
                        <a-form-item label="所属目录" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
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
                
                        <a-form-item label="排序" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
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
                            <div style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 5px;">
                                提示：数字越小越靠前，相同则按创建时间倒序
                            </div>
                        </a-form-item>
                        <a-form-item label="中文PDF" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                            <pdf-uploader
                                :value="uploadedFileInfo"
                                :original-file-id="currentRecord && currentRecord.fileID ? currentRecord.fileID : ''"
                                button-text="上传PDF"
                                @change="onZhPdfChange"
                                @uploading="uploadingZh = $event"
                            />
                            <div style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 5px;">
                                提示：仅支持PDF格式，文件大小不能超过20MB。先上传PDF文件，再提交表单。
                            </div>
                        </a-form-item>
                        <a-form-item label="英文PDF" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                            <pdf-uploader
                                :value="uploadedFileInfoEn"
                                :original-file-id="currentRecord && currentRecord.fileIDEn ? currentRecord.fileIDEn : ''"
                                removable
                                button-text="上传英文PDF"
                                @change="onEnPdfChange"
                                @uploading="uploadingEn = $event"
                            />
                            <div style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 5px;">
                                可选。没有英文版时，小程序切换到英文后会显示中文版 PDF。需要批量关联请使用「批量关联英文PDF」。
                            </div>
                        </a-form-item>
                    </a-col>

                    <!-- 右：产品参数（随所属目录变化） -->
                    <a-col :span="14">
                        <div style="font-weight: 500; margin-bottom: 12px;">产品参数</div>
                        <div v-if="selectedCatalog" style="max-height: calc(100vh - 280px); overflow-y: auto; padding-right: 8px;">
                            <a-form-item
                                v-for="param in selectedCatalog.paramTitles"
                                :key="param.id"
                                :label="param.title"
                                :colon="false"
                                :label-col="{ span: 8 }"
                                :wrapper-col="{ span: 16 }"
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
                        <div v-else style="color: #999; font-size: 13px; padding: 24px 0;">
                            请先在左侧选择所属目录，选择后在这里填写该目录对应的产品参数
                        </div>
                    </a-col>
                </a-row>
            </a-form>
        </a-modal>
    </div>
</template>

<script>
import IconEdit from '@/components/IconEdit.vue';
import IconDelete from '@/components/IconDelete.vue';
import IconPrice from '@/components/IconPrice.vue';
import { notifyError } from '@/utils/notify';
import { getProducts, createProduct, deleteProduct, getCatalogs, updateProduct, deletePdfs } from '@/api';
import { fileHref } from '@/utils/cloudUrl';
import PdfUploader from '@/components/PdfUploader.vue';
import { buildProductQuery, orphanFileIDs } from '@/utils/i18nData';

// 定义表格列的配置
const columns = [
    {
        title: '产品名称',
        dataIndex: 'name',
        scopedSlots: { customRender: 'name' },
    },
    {
        title: '所属目录',
        dataIndex: 'catalog',
        scopedSlots: { customRender: 'catalog' },
    },
    // {
    //     title: '产品参数',
    //     dataIndex: 'parameters',
    //     //     scopedSlots: { customRender: 'parameters' },
    // },
    {
        title: 'PDF文档',
        dataIndex: 'pdfUrl',
        scopedSlots: { customRender: 'pdfUrl' },
    },
    {
        title: '排序',
        dataIndex: 'sort',
        sorter: (a, b) => (a.sort || 0) - (b.sort || 0),
    },
    {
        title: '操作',
        key: 'action',
        scopedSlots: { customRender: 'action' },
    },
];

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
    components: { PdfUploader, IconEdit, IconDelete, IconPrice },
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
            // 详情弹窗
            detailVisible: false,
            detailRecord: null,
            // 从别的页面跳过来时要高亮的产品 ID
            focusId: null,
            // 分页配置
            pagination: newPagination(),
        };
    },
    computed: {
        // 详情里的参数：按目录里的参数标题顺序，配上这个产品填的值
        detailParams() {
            const r = this.detailRecord;
            const titles = (r && r.catalog && r.catalog.paramTitles) || [];
            const values = (r && r.parameters) || {};
            return titles.map((t) => (typeof t === 'string' ? { id: t, title: t, value: values[t] } : { id: t.id, title: t.title, value: values[t.id] }));
        },
        // 任意一个 PDF 正在上传
        uploading() {
            return this.uploadingZh || this.uploadingEn;
        },
    },
    mounted() {
        // 从「价格库存」等页面跳过来：?name=产品名&catalogId=目录ID&focus=产品ID（重名产品很多，所以要带上目录）
        const q = this.$route.query || {};
        if (q.name) this.searchForm.name = String(q.name);
        if (q.catalogId && !isNaN(Number(q.catalogId))) this.searchForm.catalogId = Number(q.catalogId);
        if (q.focus && !isNaN(Number(q.focus))) this.focusId = Number(q.focus);
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

        openDetail(record) {
            this.detailRecord = record;
            this.detailVisible = true;
        },
        // 从详情直接进入编辑
        editFromDetail() {
            const r = this.detailRecord;
            this.detailVisible = false;
            if (r) this.showModal(r);
        },

        // 跳到「价格库存」页并定位到这个产品（重名产品很多，带上目录；再高亮这一行）
        goShopProduct(record) {
            const catalogId = record.catalogId || (record.catalog && record.catalog.id);
            const query = { keyword: record.name, focus: String(record.id) };
            if (catalogId) query.catalogId = String(catalogId);
            this.$router.push({ path: '/shop/products', query });
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
            applyTableChange(this.pagination, pagination);
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

        // 打开 PDF 用的链接（直接用文件 ID 算出公开链接，点击即在新标签页预览）
        fileHref,

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

<style scoped>
/* 详情弹窗样式（和价格库存页的详情弹窗一致） */
.pd-foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 16px; }
.pd-title { font-weight: 600; margin: 18px 0 8px; }
.pd-title:first-child { margin-top: 0; }
.pd-cols { display: flex; gap: 28px; align-items: flex-start; }
.pd-col { flex: 1; min-width: 0; }
.pd-grid { display: grid; grid-template-columns: 110px 1fr; gap: 1px; background: #f0f0f0; border: 1px solid #f0f0f0; border-radius: 6px; overflow: hidden; }
.pd-k, .pd-v { padding: 8px 12px; }
.pd-k { background: #fafafa; color: #595959; }
.pd-v { background: #fff; word-break: break-all; }
.pd-empty { color: #bfbfbf; }
</style>
