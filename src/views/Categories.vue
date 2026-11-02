<template>
    <div>
        <!-- 搜索表单 -->
        <div style="margin-bottom: 16px;">
            <a-form layout="inline">
                <a-form-item>
                    <a-input v-model="searchForm.name" placeholder="请输入分类名称" size="small" />
                </a-form-item>
                <a-form-item>
                    <a-input-number v-model="searchForm.sort_order" placeholder="排序值" size="small" :min="0" style="width: 100px" />
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                    <a-button style="margin-left: 8px" size="small" @click="handleReset">重置</a-button>
                </a-form-item>
            </a-form>
        </div>

        <!-- 新增分类按钮 -->
        <a-button type="primary" icon="plus" size="small" @click="showModal()" style="margin-bottom: 16px;">
            新增分类
        </a-button>

        <!-- 表格组件 -->
        <a-table :columns="columns" :data-source="data" :loading="loading" rowKey="id"
            @change="handleTableChange">
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
            @ok="handleOk" @cancel="handleCancel">
            <a-form :form="form" :hide-required-mark="true">
                <a-form-item label="分类名称" :colon="false">
                    <a-input 
                        v-decorator="[
                            'name', 
                            { 
                                rules: [{ required: true, message: '请输入分类名称!' }],
                                initialValue: currentRecord ? currentRecord.name : ''
                            }
                        ]"
                        placeholder="请输入分类名称" 
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
                        placeholder="可选；没有填写时英文界面显示分类名称"
                    />
                </a-form-item>
                <a-form-item label="排序" :colon="false">
                    <a-input-number 
                        v-decorator="[
                            'sort_order', 
                            { 
                                rules: [{ required: true, message: '请输入排序数字!' }],
                                initialValue: currentRecord ? currentRecord.sort_order : 0
                            }
                        ]"
                        :min="0"
                        placeholder="请输入排序数字(数字越小越靠前)" 
                        style="width: 100%"
                    />
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script>
import IconEdit from '@/components/IconEdit.vue';
import IconDelete from '@/components/IconDelete.vue';
import { notifyError } from '@/utils/notify';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api';

// 定义表格列的配置
const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        width: '15%',
    },
    {
        title: '分类名称',
        dataIndex: 'name',
        width: '25%',
    },
    {
        title: '英文名称',
        dataIndex: 'nameEn',
        width: '20%',
        customRender: (text) => text || '-',
    },
    {
        title: '排序',
        dataIndex: 'sort_order',
        width: '20%',
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
            modalTitle: "新增分类",
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
                sort_order: undefined,
            },
        };
    },
    mounted() {
        this.fetchData();
    },
    methods: {
        // 搜索方法
        handleSearch() {
            this.fetchData();
        },
        
        // 重置方法
        handleReset() {
            this.searchForm = {
                name: '',
                sort_order: undefined,
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
            
            if (this.searchForm.sort_order !== undefined && this.searchForm.sort_order !== null) {
                query.sort_order = this.searchForm.sort_order;
            }

            getCategories(query).then(res => {
                this.loading = false;
                this.data = res;
            }).catch(error => {
                this.loading = false;
                notifyError(this, error, '获取数据失败');
            });
        },

        // 显示添加或编辑分类的模态框
        showModal(record) {
            this.form.resetFields();
            this.visible = true;
            
            if (record) {
                this.modalTitle = "编辑分类";
                this.currentRecord = record;
                this.form.setFieldsValue({
                    name: record.name,
                    nameEn: record.nameEn || '',
                    sort_order: record.sort_order
                });
            } else {
                this.modalTitle = "新增分类";
                this.currentRecord = null;
            }
        },

        // 删除分类
        handleDelete(record) {
            this.$confirm({
                title: '是否要删除该分类？',
                content: `当前选中ID是"${record.id}",分类是"${record.name}"`,
                okText: '是',
                okType: 'danger',
                cancelText: '否',
                onOk: () => {
                    deleteCategory(record.id).then(() => {
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

        // 表格变化处理
        handleTableChange() {
            this.fetchData();
        },

        // 确认模态框操作
        handleOk() {
            this.form.validateFields(async (err, values) => {
                if (!err) {
                    this.confirmLoading = true;
                    try {
                        if (this.currentRecord) {
                            // 编辑
                            await updateCategory(this.currentRecord.id, values);
                            this.$message.success('编辑成功');
                        } else {
                            // 新增
                            await createCategory(values);
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
        },
    },
};
</script> 