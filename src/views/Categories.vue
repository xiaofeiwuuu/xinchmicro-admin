<template>
    <div>
        <!-- 搜索表单 -->
        <div style="margin-bottom: 16px;">
            <a-form layout="inline">
                <a-form-item>
                    <a-input v-model="searchForm.name" placeholder="请输入分类名称" size="small" style="width: 160px" />
                </a-form-item>
                <a-form-item>
                    <a-input-number v-model="searchForm.sort_order" placeholder="排序值" size="small" :min="0" style="width: 160px" />
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                    <a-button style="margin-left: 8px" size="small" @click="handleReset">重置</a-button>
                </a-form-item>
            </a-form>
        </div>

        <!-- 新增分类按钮 -->
        <a-button v-can="'category.edit'" type="primary" icon="plus" size="small" @click="showModal()" style="margin-bottom: 16px;">
            新增分类
        </a-button>

        <!-- 表格组件 -->
        <a-table :scroll="tableScroll" :columns="columns" :data-source="data" :loading="loading" rowKey="id"
            :pagination="pagination" @change="handleTableChange">
            <template slot="copy" slot-scope="text">
                <span v-if="text" class="copy-cell" title="点击复制" @click="copyName(text)">{{ text }}</span>
                <span v-else>-</span>
            </template>
            <!-- 操作列统一用 .row-actions：按钮并排，放不下整个按钮换行，不用竖分隔线（见 scss/components/_table.scss） -->
            <template slot="status" slot-scope="text, record">
                <a-switch size="small" :checked="record.status !== 'inactive'" :disabled="!can('category.edit')" @change="(on) => toggleStatus(record, on)" />
            </template>
            <div slot="action" slot-scope="text, record" class="row-actions">
                <!-- 编辑按钮 -->
                <a-button v-can="'category.edit'" type="link" size="small" @click="showModal(record)">
                    <icon-edit />
                    <span class="text-dark">编辑</span>
                </a-button>
                <!-- 删除按钮 -->
                <a-button v-can="'category.edit'" type="link" size="small" @click="handleDelete(record)">
                    <icon-delete />
                    <span class="text-danger">删除</span>
                </a-button>
            </div>
        </a-table>

        <!-- 编辑模态框 -->
        <a-modal :maskClosable="false" :title="modalTitle" :visible="visible" :confirm-loading="confirmLoading"
            @ok="handleOk" @cancel="handleCancel">
            <a-form :form="form" :hide-required-mark="true">
                <a-form-item label="分类名称" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
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
                <a-form-item label="英文名称" :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
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
                <a-form-item :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                    <span slot="label">显示 <a-tooltip title="关闭后，小程序里看不到这个分类，以及它下面所有的目录和产品（包括商城）；后台不受影响"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
                    <a-switch v-decorator="['show', { valuePropName: 'checked', initialValue: currentRecord ? currentRecord.status !== 'inactive' : true }]" />
                </a-form-item>
                <a-form-item :colon="false" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                    <span slot="label">排序 <a-tooltip title="数字越小越靠前"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
                    <a-input-number 
                        v-decorator="[
                            'sort_order', 
                            { 
                                rules: [{ required: true, message: '请输入排序数字!' }],
                                initialValue: currentRecord ? currentRecord.sort_order : 0
                            }
                        ]"
                        :min="0"
                        placeholder="请输入排序数字" 
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
import { copyToClipboard } from '@/utils/copy';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api';
import { can } from '@/utils/auth';

// 表单里的「显示」开关换成服务端的 status
const toBody = ({ show, ...rest }) => ({ ...rest, status: show === false ? 'inactive' : 'active' });

// 定义表格列的配置
const columns = [
    {
        title: '分类名称',
        dataIndex: 'name',
        scopedSlots: { customRender: 'copy' },
    },
    {
        title: '英文名称',
        dataIndex: 'nameEn',
        scopedSlots: { customRender: 'copy' },
    },
    {
        title: '排序',
        dataIndex: 'sort_order',
    },
    {
        title: '状态',
        key: 'status',
        // 一个开关加两个字，固定窄宽度
        width: 130,
        scopedSlots: { customRender: 'status' },
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
            modalTitle: "新增分类",
            pagination: newPagination(), // 数据一次取全，前端分页
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
        can,
        // 列表里直接切换显示 / 隐藏：更新接口要带名称等字段，原样带上
        toggleStatus(record, on) {
            // 二次确认：开关是受控的，点取消不用还原
            this.$confirm({
                title: on ? `确定显示「${record.name}」吗？` : `确定隐藏「${record.name}」吗？`,
                content: on ? '显示后，小程序里能看到这个分类。' : '隐藏后，小程序里看不到这个分类，以及它下面所有的目录和产品（包括商城）；后台不受影响。',
                okText: on ? '显示' : '隐藏', cancelText: '取消',
                onOk: () => this.applyStatus(record, on)
            });
        },
        async applyStatus(record, on) {
            try {
                await updateCategory(record.id, { name: record.name, nameEn: record.nameEn || '', sort_order: record.sort_order, status: on ? 'active' : 'inactive' });
                this.$message.success(on ? '已显示' : '已隐藏');
            } catch (error) {
                notifyError(this, error, '操作失败');
            }
            this.fetchData();
        },
        async copyName(text) {
            if (await copyToClipboard(text)) this.$message.success('已复制：' + text);
            else this.$message.warning('复制失败，请手动复制');
        },
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
                const last = Math.max(1, Math.ceil(res.length / this.pagination.pageSize));
                if (this.pagination.current > last) this.pagination.current = last;
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
                    sort_order: record.sort_order,
                    show: record.status !== 'inactive'
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
        handleTableChange(p) {
            applyTableChange(this.pagination, p);
        },

        // 确认模态框操作
        handleOk() {
            this.form.validateFields(async (err, values) => {
                if (!err) {
                    this.confirmLoading = true;
                    try {
                        if (this.currentRecord) {
                            // 编辑
                            await updateCategory(this.currentRecord.id, toBody(values));
                            this.$message.success('编辑成功');
                        } else {
                            // 新增
                            await createCategory(toBody(values));
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

<style scoped>
/* 表单里的提示：问号图标，鼠标移上去或手指点一下显示 */
.help-icon { margin-left: 4px; color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
.copy-cell { cursor: pointer; }
.copy-cell:hover { color: #1890ff; }
</style>
