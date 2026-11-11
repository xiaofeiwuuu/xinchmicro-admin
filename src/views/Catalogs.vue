<template>
    <div>
        <!-- 搜索表单 -->
        <div style="margin-bottom: 16px;">
            <a-form layout="inline">
                <a-form-item>
                    <a-input v-model="searchForm.name" placeholder="请输入目录名称" size="small" style="width: 160px" />
                </a-form-item>
                <a-form-item>
                    <a-select
                        v-model="searchForm.categoryId"
                        placeholder="请选择分类"
                        style="width: 160px"
                        size="small"
                        allowClear
                    >
                        <a-select-option v-for="category in categories" :key="category.id" :value="category.id">
                            {{ category.name }}
                        </a-select-option>
                    </a-select>
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                    <a-button style="margin-left: 8px" size="small" @click="handleReset">重置</a-button>
                </a-form-item>
            </a-form>
        </div>

        <!-- 新增目录按钮 -->
        <a-button v-can="'catalog.edit'" type="primary" icon="plus" size="small" @click="showModal()" style="margin-bottom: 16px;">
            新增目录
        </a-button>

        <!-- 表格组件 -->
        <a-table :scroll="tableScroll" :columns="tableColumns" :data-source="data" :loading="loading" rowKey="id" :pagination="pagination" @change="onTableChange">
            <template slot="paramTitles" slot-scope="text">
                <a-tag v-for="(item, index) in text" :key="item.id || index" color="blue">{{ item.title || item }}</a-tag>
            </template>
            <template slot="name" slot-scope="text, record">
                <span class="copy-cell" title="点击复制" @click="copyName(text)">{{ text }}</span>
                <div v-if="record.nameEn" style="color: #999; font-size: 12px;"><span class="copy-cell" title="点击复制" @click="copyName(record.nameEn)">{{ record.nameEn }}</span></div>
            </template>
            <template slot="showInMall" slot-scope="text">
                <a-tag v-if="text === false" color="orange">不展示</a-tag>
                <a-tag v-else color="green">展示</a-tag>
            </template>
            <template slot="category" slot-scope="text">
                {{ text ? text.name : '-' }}
            </template>
            <!-- 操作列统一用 .row-actions：按钮并排，放不下整个按钮换行，不用竖分隔线（见 scss/components/_table.scss） -->
            <div slot="action" slot-scope="text, record" class="row-actions">
                <!-- 编辑按钮 -->
                <a-button v-can="'catalog.edit'" type="link" size="small" @click="showModal(record)">
                    <icon-edit />
                    <span class="text-dark">编辑</span>
                </a-button>
                <!-- 删除按钮 -->
                <a-button v-can="'catalog.edit'" type="link" size="small" @click="handleDelete(record)">
                    <icon-delete />
                    <span class="text-danger">删除</span>
                </a-button>
            </div>
        </a-table>

        <!-- 编辑模态框：左边是基本信息，右边是参数标题 -->
        <a-modal :maskClosable="false" :title="modalTitle" :visible="visible" :confirm-loading="confirmLoading"
            width="980px" okText="确定" cancelText="取消" @ok="handleOk" @cancel="handleCancel">
            <a-form :form="form" :hide-required-mark="true">
                <!-- type="flex"：左右两列等高，中间的虚线才能从上贯到下 -->
                <a-row type="flex" :gutter="32">
                    <!-- 左：基本信息 -->
                    <a-col :span="12">
                        <a-form-item label="目录名称" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                            <a-input
                                v-decorator="[
                                    'name',
                                    {
                                        rules: [{ required: true, message: '请输入目录名称!' }],
                                        initialValue: currentRecord ? currentRecord.name : ''
                                    }
                                ]"
                                placeholder="请输入目录名称"
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
                                placeholder="可选；没有填写时英文界面显示目录名称"
                            />
                        </a-form-item>
                        <a-form-item label="所属分类" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                            <a-select
                                v-decorator="[
                                    'categoryId',
                                    {
                                        rules: [{ required: true, message: '请选择所属分类!' }],
                                        initialValue: currentRecord ? currentRecord.categoryId : undefined
                                    }
                                ]"
                                placeholder="请选择所属分类"
                            >
                                <a-select-option v-for="category in categories" :key="category.id" :value="category.id">
                                    {{ category.name }}
                                </a-select-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                            <span slot="label">商城展示 <a-tooltip title="关闭后，这个目录下的产品不出现在商城里，也不能下单；产品页的浏览、查看文档不受影响"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
                            <a-switch
                                v-decorator="[
                                    'showInMall',
                                    {
                                        valuePropName: 'checked',
                                        initialValue: currentRecord ? currentRecord.showInMall !== false : true
                                    }
                                ]"
                            />
                        </a-form-item>
                        <a-form-item :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                            <span slot="label">排序 <a-tooltip title="数字越小越靠前，相同则按创建时间倒序"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
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
                        </a-form-item>
                    </a-col>

                    <!-- 右：参数标题 -->
                    <a-col :span="12" class="col-divider">
                        <div style="font-weight: 500; margin-bottom: 8px;">参数标题 <a-tooltip title="如型号、封装、功耗等"><a-icon type="question-circle" class="help-icon" /></a-tooltip></div>
                        <div style="display: flex; margin-bottom: 8px; color: #999; font-size: 12px;">
                            <div style="flex: 1; margin-right: 8px;">中文标题</div>
                            <div style="flex: 1; margin-right: 8px;">英文标题（可选）</div>
                            <div style="width: 32px;"></div>
                        </div>
                        <div style="max-height: 440px; overflow-y: auto; padding-right: 4px;">
                            <div v-for="(param, index) in paramTitlesList" :key="param.id || index" style="display: flex; margin-bottom: 8px;">
                                <a-input
                                    v-model="param.title"
                                    placeholder="请输入参数标题"
                                    style="flex: 1; margin-right: 8px;"
                                />
                                <a-input
                                    v-model="param.titleEn"
                                    placeholder="英文标题（可选）"
                                    style="flex: 1; margin-right: 8px;"
                                />
                                <a-button type="danger" icon="delete" @click="removeParamTitle(index)" />
                            </div>
                        </div>
                        <a-button type="dashed" icon="plus" @click="addParamTitle" style="width: 100%; margin-top: 4px;">
                            添加参数标题
                        </a-button>
                        <div v-if="paramTitlesList.length === 0" style="color: #ff4d4f; font-size: 12px; margin-top: 5px;">
                            请添加至少一个参数标题
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
import { notifyError } from '@/utils/notify';
import { copyToClipboard } from '@/utils/copy';
import { getCatalogs, createCatalog, updateCatalog, deleteCatalog, getCategories } from '@/api';

// 定义表格列的配置
const columns = [
    {
        title: '目录名称',
        dataIndex: 'name',
        scopedSlots: { customRender: 'name' },
    },
    {
        title: '所属分类',
        dataIndex: 'category',
        scopedSlots: { customRender: 'category' },
    },
    {
        title: '参数标题',
        dataIndex: 'paramTitles',
        scopedSlots: { customRender: 'paramTitles' },
    },
    {
        title: '商城展示',
        dataIndex: 'showInMall',
        // 这一列内容很短（一个「展示」标签），给固定窄宽度，把空间留给「参数标题」
        width: 100,
        scopedSlots: { customRender: 'showInMall' },
    },
    {
        title: '排序',
        dataIndex: 'sort',
        // 只有一个数字加排序箭头，同样固定窄宽度
        width: 90,
        sorter: (a, b) => (a.sort || 0) - (b.sort || 0),
    },
    {
        title: '操作',
        key: 'action',
        // 编辑 + 删除两个按钮并排要约 150px；列宽是平均分配的，窗口不宽时平均下来放不下，会把删除挤到下一行，所以这一列给固定宽度（其余列仍平分剩下的）
        width: 150,
        scopedSlots: { customRender: 'action' },
    },
];

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
    components: { IconEdit, IconDelete },
    data() {
        return {
            modalTitle: "新增目录",
            pagination: newPagination(), // 数据一次取全，前端分页
            data: [],
            loading: false,
            tableWidth: 0, // 表格当前宽度（窗口变化时重新量），用来算「目录名称」「所属分类」的宽度
            visible: false,
            confirmLoading: false,
            form: this.$form.createForm(this),
            currentRecord: null,
            // 搜索表单数据
            searchForm: {
                name: '',
                categoryId: undefined,
            },
            // 分类列表
            categories: [],
            // 参数标题列表（新格式：[{ id, title }]）
            paramTitlesList: [],
        };
    },
    computed: {
        // 目录名称、所属分类内容都很短：宽度 = 表格宽度的一定比例，但不超过上限，多出来的全部留给「参数标题」。
        // 不用死宽度：窗口窄时死宽度会把参数标题挤没；表格是固定布局，max-width 和 CSS min() 对列都不起作用，所以用代码按表格宽度算
        tableColumns() {
            const w = this.tableWidth || 1000;
            const widths = { name: Math.round(Math.min(w * 0.16, 200)), category: Math.round(Math.min(w * 0.14, 170)) };
            return columns.map((c) => (widths[c.dataIndex] ? { ...c, width: widths[c.dataIndex] } : c));
        },
    },
    mounted() {
        this.fetchCategories();
        this.fetchData();
        this.measureTable();
        window.addEventListener('resize', this.measureTable);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.measureTable);
    },
    methods: {
        measureTable() {
            const el = this.$el && this.$el.querySelector && this.$el.querySelector('.ant-table-wrapper');
            if (el && el.clientWidth) this.tableWidth = el.clientWidth;
        },
        async copyName(text) {
            if (await copyToClipboard(text)) this.$message.success('已复制：' + text);
            else this.$message.warning('复制失败，请手动复制');
        },
        onTableChange(p) {
            applyTableChange(this.pagination, p);
        },
        // 获取分类列表
        fetchCategories() {
            getCategories().then(res => {
                this.categories = res;
            }).catch(error => {
                notifyError(this, error, '获取分类列表失败');
            });
        },

        // 搜索方法
        handleSearch() {
            this.fetchData();
        },
        
        // 重置方法
        handleReset() {
            this.searchForm = {
                name: '',
                categoryId: undefined,
            };
            this.fetchData();
        },

        // 获取数据方法
        fetchData() {
            this.loading = true;
            const query = {};
            
            if (this.searchForm.name) {
                query.name = this.searchForm.name;
            }
            
            if (this.searchForm.categoryId) {
                query.categoryId = this.searchForm.categoryId;
            }

            getCatalogs(query).then(res => {
                this.loading = false;
                this.data = res;
                const last = Math.max(1, Math.ceil(res.length / this.pagination.pageSize));
                if (this.pagination.current > last) this.pagination.current = last;
            }).catch(error => {
                this.loading = false;
                notifyError(this, error, '获取数据失败');
            });
        },

        // 添加参数标题
        addParamTitle() {
            this.paramTitlesList.push({ title: '', titleEn: '' });
        },

        // 删除参数标题
        removeParamTitle(index) {
            this.paramTitlesList.splice(index, 1);
        },

        // 显示添加或编辑目录的模态框
        showModal(record) {
            this.form.resetFields();
            this.visible = true;

            if (record) {
                this.modalTitle = "编辑目录";
                this.currentRecord = record;
                this.form.setFieldsValue({
                    name: record.name,
                    nameEn: record.nameEn || '',
                    categoryId: record.categoryId,
                    sort: record.sort != null ? record.sort : 999,
                    showInMall: record.showInMall !== false,
                });
                // 复制 paramTitles 数组（保留 id）
                this.paramTitlesList = (record.paramTitles || []).map(p => ({
                    id: p.id,
                    title: p.title || p,  // 兼容旧格式（纯字符串）
                    titleEn: p.titleEn || ''
                }));
            } else {
                this.modalTitle = "新增目录";
                this.currentRecord = null;
                this.paramTitlesList = [];
            }
        },

        // 删除目录
        handleDelete(record) {
            this.$confirm({
                title: '是否要删除该目录？',
                content: `当前选中ID是"${record.id}",目录是"${record.name}"`,
                okText: '是',
                okType: 'danger',
                cancelText: '否',
                onOk: () => {
                    deleteCatalog(record.id).then(() => {
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

        // 确认模态框操作
        handleOk() {
            // 验证参数标题
            const validParamTitles = this.paramTitlesList.filter(p => p.title && p.title.trim());
            if (validParamTitles.length === 0) {
                this.$message.error('请添加至少一个参数标题!');
                return;
            }

            this.form.validateFields(async (err, values) => {
                if (!err) {
                    this.confirmLoading = true;
                    try {
                        // 构建提交数据
                        const submitData = {
                            name: values.name,
                            nameEn: values.nameEn || '',
                            categoryId: values.categoryId,
                            sort: values.sort,
                            showInMall: !!values.showInMall,
                            paramTitles: validParamTitles.map(p => ({
                                id: p.id,  // 保留 id（新增时为 undefined，后端会自动生成）
                                title: p.title.trim(),
                                // 始终带上英文标题（空串表示清空）。不带的话服务端会保留原有英文标题
                                titleEn: (p.titleEn || '').trim()
                            }))
                        };

                        if (this.currentRecord) {
                            // 编辑
                            await updateCatalog(this.currentRecord.id, submitData);
                            this.$message.success('编辑成功');
                        } else {
                            // 新增
                            await createCatalog(submitData);
                            this.$message.success('新增成功');
                        }
                        this.visible = false;
                        this.fetchData();
                    } catch (error) {
                        notifyError(this, error, '操作失败');
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
            this.paramTitlesList = [];
        },
    },
};
</script>

<style scoped>
/* 表单里的提示：问号图标，鼠标移上去或手指点一下显示 */
.help-icon { margin-left: 4px; color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
/* 左右两列中间的虚线（画在右列的左边，两边各留 16px） */
.col-divider { border-left: 1px dashed #d9d9d9; }
.copy-cell { cursor: pointer; }
.copy-cell:hover { color: #1890ff; }
</style>
