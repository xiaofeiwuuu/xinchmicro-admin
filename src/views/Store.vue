<template>
    <div>
        <!-- 新增门店按钮 -->
        <a-button type="primary" v-hasButtonPermission="[1]" icon="plus" size="small" @click="showStore(undefined)">
            新增
        </a-button>

        <!-- 表格组件，显示门店数据 -->
        <a-table :columns="columns" :data-source="data" :pagination="pagination" :loading="loading" rowKey="id"
            @change="handleTableChange">
            <span slot="qr_code" slot-scope="text, record">
                <img :src="record.qr_code" v-if="record.qr_code" :alt="record.name" @click="previewFn(record.qr_code)"
                    style="width: 48px; height: 48px;">
            </span>
            <span slot="action" slot-scope="text, record">
                <!-- 编辑按钮 -->
                <a-button v-hasButtonPermission="[1]" type="link" size="small" @click="showStore(record)">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path class="fill-muted"
                            d="M13.5858 3.58579C14.3668 2.80474 15.6332 2.80474 16.4142 3.58579C17.1953 4.36683 17.1953 5.63316 16.4142 6.41421L15.6213 7.20711L12.7929 4.37868L13.5858 3.58579Z"
                            fill="#111827" />
                        <path class="fill-muted"
                            d="M11.3787 5.79289L3 14.1716V17H5.82842L14.2071 8.62132L11.3787 5.79289Z" fill="#111827" />
                    </svg>
                    <span class="text-dark">编辑</span>
                </a-button>
                <a-button v-hasButtonPermission="[1,2]" type="link" size="small" @click="qrCodeFn(record)">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path class="fill-muted"
                            d="M13.5858 3.58579C14.3668 2.80474 15.6332 2.80474 16.4142 3.58579C17.1953 4.36683 17.1953 5.63316 16.4142 6.41421L15.6213 7.20711L12.7929 4.37868L13.5858 3.58579Z"
                            fill="#111827" />
                        <path class="fill-muted"
                            d="M11.3787 5.79289L3 14.1716V17H5.82842L14.2071 8.62132L11.3787 5.79289Z" fill="#111827" />
                    </svg>
                    <span class="text-dark">生成二维码</span>
                </a-button>
                <a-button v-hasButtonPermission="[1,2]" type="link" size="small" @click="showImage(record)">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path class="fill-muted"
                            d="M13.5858 3.58579C14.3668 2.80474 15.6332 2.80474 16.4142 3.58579C17.1953 4.36683 17.1953 5.63316 16.4142 6.41421L15.6213 7.20711L12.7929 4.37868L13.5858 3.58579Z"
                            fill="#111827" />
                        <path class="fill-muted"
                            d="M11.3787 5.79289L3 14.1716V17H5.82842L14.2071 8.62132L11.3787 5.79289Z" fill="#111827" />
                    </svg>
                    <span class="text-dark">查看图片</span>
                </a-button>
                <a-divider type="vertical" />
                <!-- 删除按钮 -->
                <a-button v-hasButtonPermission="[1]" type="link" size="small" @click="deleteStoreFn(record)">
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
        <a-modal :maskClosable="false" :title="title" :visible="visible" :confirm-loading="confirmLoading"
            @ok="handleOk" @cancel="handleCancel">
            <a-form id="components-form-demo-normal-login" :form="form" :hide-required-mark="true">
                <a-form-item class="mb-10" label="门店" :colon="false">
                    <a-input v-decorator="['name', { rules: [{ required: true, message: '请输入门店名称!' }] }]"
                        placeholder="门店" />
                </a-form-item>
                <a-form-item class="mb-5" label="描述" :colon="false">
                    <a-textarea v-decorator="['description']" placeholder="请输入门店描述"
                        :auto-size="{ minRows: 3, maxRows: 5 }" />
                </a-form-item>
            </a-form>
        </a-modal>
        <a-modal :footer="null" :bodyStyle="{height: '80vh',overflow: 'auto'}" :visible="imageVisible" @cancel="imageCancel" width="80%">
            <image-page :id="imageRecord.id" />
        </a-modal>
        <a-modal :visible="previewVisible" :footer="null" @cancel="handleCancel2" :zIndex="1002">
            <img alt="example" style="width: 100%;max-width: 80vw;max-height: 80vh;" :src="previewImage" />
        </a-modal>
    </div>
</template>

<script>
import { getStoreList, addStore, deleteStore, updateStore, setQrCode } from '@/api'; // 导入 API 函数
import imagePage from './DisplayPage.vue'
// 定义表格列的配置
const columns = [
    {
        title: 'ID', // 列标题
        dataIndex: 'id', // 数据索引
        width: '20%', // 列宽
    },
    {
        title: '门店', // 列标题
        dataIndex: 'name', // 数据索引
        width: '20%', // 列宽
    },
    {
        title: '二维码', // 列标题
        dataIndex: 'qr_code', // 数据索引
        width: '20%', // 列宽
        scopedSlots: { customRender: 'qr_code' }, // 自定义渲染
    },
    {
        title: '描述', // 列标题
        dataIndex: 'description', // 数据索引
        width: '30%', // 列宽
    },
    {
        title: '操作', // 列标题
        key: 'action', // 唯一键
        scopedSlots: { customRender: 'action' }, // 自定义渲染
    },
];

export default {
    data() {
        const username = localStorage.getItem('username');
        return {
            title: "新增", // 模态框标题
            data: [], // 表格数据
            pagination: {
                pageSize: 10, // 每页大小
                current: 1, // 当前页
                total: 0 // 总记录数
            },
            loading: false, // 加载状态
            columns, // 表格列配置
            visible: false, // 模态框可见性
            confirmLoading: false, // 确认按钮加载状态
            form: this.$form.createForm(this, {}), // 创建表单
            username,
            imageVisible: false,
            imageRecord: {
                id: undefined
            },
            previewVisible: false,
            previewImage: ''
        };
    },
    mounted() {
        this.fetch(); // 组件挂载后获取数据
    },
    components: {
        imagePage
    },
    methods: {
        // 显示添加或编辑门店的模态框
        showStore(row) {
            this.form.resetFields(); // 重置表单
            this.form.id = undefined; // 清空ID
            this.visible = true; // 显示编辑模态框
            if (row && row.id) {
                this.title = "编辑"; // 设置标题为编辑
                setTimeout(() => {
                    this.form.id = row.id; // 设置ID
                    this.form.setFieldsValue({ // 设置表单字段值
                        name: row.name,
                        description: row.description,
                    });
                }, 100);

            } else {
                this.title = "新增"; // 设置标题为新增
            }
        },
        // 删除门店
        deleteStoreFn(row) {
            this.$confirm({
                title: '是否要删除该店铺？', // 确认框标题
                content: `当前选中ID是"${row.id}",门店是"${row.name}"`, // 确认框内容
                okText: '是', // 确认按钮文本
                okType: 'danger', // 确认按钮类型
                cancelText: '否', // 取消按钮文本
                onOk: () => {
                    deleteStore({ id: row.id }).then(() => {
                        this.$message.success('删除成功'); // 显示成功消息
                        this.fetch(); // 重新获取数据
                    }).catch((error) => {
                        this.$message.error(error.message); // 显示错误消息
                    });
                },
                onCancel: () => {
                    this.$message.info('取消删除'); // 显示取消消息
                },
            });
        },
        // 表格变化处理
        handleTableChange(pagination) {
            const pager = { ...pagination }; // 复制当前分页信息
            this.pagination = pager; // 更新分页信息
            this.fetch({
                limit: pagination.pageSize, // 每页大小
                page: pagination.current, // 当前页
            });
        },
        // 获取数据
        fetch(params = {}) {
            this.loading = true; // 设置加载状态
            getStoreList({
                limit: this.pagination.pageSize, // 使用分页中的pageSize
                page: this.pagination.current, // 使用分页中的current
                ...params, // 其他参数
            }).then(res => {
                this.loading = false; // 取消加载状态
                this.data = res.rows; // 设置表格数据
                this.pagination.total = res.count; // 更新分页信息
            }).catch(error => {
                this.loading = false; // 取消加载状态
                this.$message.error('获取数据失败'); // 显示错误消息
            });
        },
        // 确认模态框操作
        handleOk() {
            this.form.validateFields(async (err, values) => {
                if (!err) {
                    this.confirmLoading = true; // 设置确认按钮加载状态
                    try {
                        if (this.form.id) {
                            values.id = this.form.id; // 设置ID
                            await updateStore(values); // 更新门店
                            this.$message.success('编辑成功'); // 显示成功消息
                        } else {
                            await addStore(values); // 新增门店
                            this.$message.success('新增成功'); // 显示成功消息
                        }
                    } catch (error) {
                        this.$message.error(error.message); // 显示错误消息
                    } finally {
                        this.fetch(); // 重新获取数据
                        this.visible = false; // 关闭模态框
                        this.form.id = undefined; // 清空ID
                        this.confirmLoading = false; // 取消确认按钮加载状态
                    }
                }
            });
        },
        // 取消模态框操作
        handleCancel() {
            this.visible = false; // 关闭模态框
            setTimeout(() => {
                this.form.resetFields(); // 重置表单
                this.form.id = undefined; // 清空ID
            }, 10);
        },
        showImage(record) {
            this.imageRecord = record; // 设置记录
            this.imageVisible = true; // 显示模态框
        },
        imageCancel() {
            this.imageVisible = false; // 关闭模态框
        },
        qrCodeFn(record) {
            setQrCode({ store_id: record.id }).then(res => {
                this.$message.success('生成二维码成功'); // 显示成功消息
                this.fetch(); // 重新获取数据
            }).catch((error) => {
                this.$message.error(error.message); // 显示错误消息
            });
        },
        previewFn(url) {
            this.previewImage = url; // 设置图片
            this.previewVisible = true; // 显示模态框
        },
        handleCancel2() {
            this.previewVisible = false; // 关闭模态框
            this.previewImage = ''; // 清空图片
        },
    },
};
</script>