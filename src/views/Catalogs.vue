<template>
    <div>
        <!-- 搜索表单 -->
        <div style="margin-bottom: 16px;">
            <a-form layout="inline">
                <a-form-item>
                    <a-input v-model="searchForm.name" placeholder="请输入目录名称" size="small" />
                </a-form-item>
                <a-form-item>
                    <a-select
                        v-model="searchForm.categoryId"
                        placeholder="请选择分类"
                        style="width: 200px"
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
        <a-button type="primary" icon="plus" size="small" @click="showModal()" style="margin-bottom: 16px;">
            新增目录
        </a-button>

        <!-- 表格组件 -->
        <a-table :columns="columns" :data-source="data" :loading="loading" rowKey="id">
            <template slot="paramTitles" slot-scope="text">
                <a-tag v-for="(item, index) in text" :key="item.id || index" color="blue">{{ item.title || item }}</a-tag>
            </template>
            <template slot="name" slot-scope="text, record">
                {{ text }}
                <div v-if="record.nameEn" style="color: #999; font-size: 12px;">{{ record.nameEn }}</div>
            </template>
            <template slot="category" slot-scope="text">
                {{ text ? text.name : '-' }}
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

        <!-- 编辑模态框：左边是基本信息，右边是参数标题 -->
        <a-modal :maskClosable="false" :title="modalTitle" :visible="visible" :confirm-loading="confirmLoading"
            width="980px" okText="确定" cancelText="取消" @ok="handleOk" @cancel="handleCancel">
            <a-form :form="form" :hide-required-mark="true">
                <a-row :gutter="32">
                    <!-- 左：基本信息 -->
                    <a-col :span="10">
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
                    </a-col>

                    <!-- 右：参数标题 -->
                    <a-col :span="14">
                        <div style="font-weight: 500; margin-bottom: 8px;">参数标题</div>
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
                        <div style="color: #999; font-size: 12px; margin-top: 5px;">
                            提示：如型号、封装、功耗等
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
import { getCatalogs, createCatalog, updateCatalog, deleteCatalog, getCategories } from '@/api';

// 定义表格列的配置
const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        width: '10%',
    },
    {
        title: '目录名称',
        dataIndex: 'name',
        width: '16%',
        scopedSlots: { customRender: 'name' },
    },
    {
        title: '所属分类',
        dataIndex: 'category',
        width: '15%',
        scopedSlots: { customRender: 'category' },
    },
    {
        title: '参数标题',
        dataIndex: 'paramTitles',
        width: '30%',
        scopedSlots: { customRender: 'paramTitles' },
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
    components: { IconEdit, IconDelete },
    data() {
        return {
            modalTitle: "新增目录",
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
                categoryId: undefined,
            },
            // 分类列表
            categories: [],
            // 参数标题列表（新格式：[{ id, title }]）
            paramTitlesList: [],
        };
    },
    mounted() {
        this.fetchCategories();
        this.fetchData();
    },
    methods: {
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