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
            <template slot="category" slot-scope="text">
                {{ text ? text.name : '-' }}
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
            @ok="handleOk" @cancel="handleCancel">
            <a-form :form="form" :hide-required-mark="true">
                <a-form-item label="目录名称" :colon="false">
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
                <a-form-item label="所属分类" :colon="false">
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
                <a-form-item label="参数标题" :colon="false">
                    <div>
                        <div v-for="(param, index) in paramTitlesList" :key="param.id || index" style="display: flex; margin-bottom: 8px;">
                            <a-input
                                v-model="param.title"
                                placeholder="请输入参数标题"
                                style="flex: 1; margin-right: 8px;"
                            />
                            <a-button type="danger" icon="delete" @click="removeParamTitle(index)" />
                        </div>
                        <a-button type="dashed" icon="plus" @click="addParamTitle" style="width: 100%;">
                            添加参数标题
                        </a-button>
                        <div v-if="paramTitlesList.length === 0" style="color: #ff4d4f; font-size: 12px; margin-top: 5px;">
                            请添加至少一个参数标题
                        </div>
                    </div>
                    <div style="color: #999; font-size: 12px; margin-top: 5px;">
                        提示：如型号、封装、功耗等
                    </div>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script>
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
        width: '20%',
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
                this.$message.error('获取分类列表失败: ' + error.message);
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
                this.$message.error('获取数据失败: ' + error.message);
            });
        },

        // 添加参数标题
        addParamTitle() {
            this.paramTitlesList.push({ title: '' });
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
                    categoryId: record.categoryId,
                    sort: record.sort != null ? record.sort : 999,
                });
                // 复制 paramTitles 数组（保留 id）
                this.paramTitlesList = (record.paramTitles || []).map(p => ({
                    id: p.id,
                    title: p.title || p  // 兼容旧格式（纯字符串）
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
                            categoryId: values.categoryId,
                            sort: values.sort,
                            paramTitles: validParamTitles.map(p => ({
                                id: p.id,  // 保留 id（新增时为 undefined，后端会自动生成）
                                title: p.title.trim()
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
                        this.$message.error('操作失败: ' + error.message);
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