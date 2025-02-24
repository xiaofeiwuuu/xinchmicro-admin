<template>
    <div>
        <div class="flex items-center gap-2" style="display: flex;margin-bottom: 10px;">
            <a-input placeholder="用户昵称" size="small" style="width: 240px;margin-right: 10px;" v-model="nick_name" />
            <a-input placeholder="账号" size="small" style="width: 240px;margin-right: 10px;" v-model="username" />
            <div>
                <a-button icon="search" size="small" style="margin-right: 10px;" @click="fetch({ nick_name, username })">
                    搜索
                </a-button>
                <a-button icon="reload" size="small" style="margin-right: 10px;" @click="reset">
                    重置
                </a-button>
            </div>
        </div>
        <!-- 新增用户按钮 -->
        <a-button type="primary" v-hasButtonPermission="[1,2]" icon="plus" size="small" @click="showUser(undefined)">
            新增
        </a-button>

        <!-- 表格组件，显示用户数据 -->
        <a-table :columns="columns" :data-source="data" :pagination="pagination" :loading="loading" rowKey="id"
            @change="handleTableChange">
            <span slot="role" slot-scope="text, record" >
                {{ record.role === 1 ? '超级管理员' : record.role === 2 ? '门店管理员' : '游客' }}
            </span>
            <span slot="store_id" slot-scope="text, record">
                <a-tag color="blue" v-for="item in record.store_id" :key="item.id">
                    {{ item.name }}
                </a-tag>
            </span>
            <span slot="action" slot-scope="text, record">
                <!-- 编辑按钮 -->
                <a-button v-hasButtonPermission="[1,2]" type="link" size="small" @click="showUser(record)">
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
                <a-button v-hasButtonPermission="[1,2]" type="link" size="small" @click="deleteUserFn(record)">
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
                <a-form-item class="mb-10" label="角色" :colon="false">
                    <a-select v-decorator="['role']" allowClear size="small" style="width: 100%"
                        @change="changeIn">
                        <a-select-option :value="1" v-if="role2">
                            超级管理员
                        </a-select-option>
                        <a-select-option :value="2">
                            门店管理员
                        </a-select-option>
                        <a-select-option :value="3">
                            游客
                        </a-select-option>
                    </a-select>
                </a-form-item>

                <a-form-item class="mb-5" label="用户昵称" :colon="false">
                    <a-input v-decorator="['nick_name', { rules: [{ required: true, message: '请输入用户昵称!' }] }]"
                        placeholder="请输入用户昵称" />
                </a-form-item>
                <a-form-item class="mb-5" label="登录账号" :colon="false" v-if="title === '新增'">
                    <a-input v-decorator="['username', { rules: [{ required: true, message: '请输入账号!' }] }]"
                        placeholder="请输入账号" />
                </a-form-item>
                <a-form-item class="mb-5" label="密码" :colon="false">
                    <a-input-password
                        v-decorator="['password', { rules: [{ required: title === '新增', message: '请输入密码!' }] }]"
                        placeholder="请输入密码" />
                </a-form-item>
                <a-form-item class="mb-5" :colon="false">
                    <template v-slot:label style="display: flex;align-items: center;">
                        <span>门店</span>
                        <a-tooltip>
                            <template slot="title">
                                新增或修改门店,可能会导致该门店二维码失效,需重新生成二维码
                            </template>
                            <a-icon type="question-circle"
                                style="vertical-align: middle;color: #ff7875;margin-left: 5px;" />
                        </a-tooltip>
                    </template>
                    <a-select mode="multiple" placeholder="请选择门店" optionFilterProp="label" :labelInValue="true"
                        :value="selectedItems" style="width: 100%" @change="handleChange">
                        <a-select-option v-for="item in filteredOptions" :key="item.id" :value="item.id"
                            :label="item.label">
                            {{ item.label }}
                        </a-select-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script>
import { addUser, deleteUser, updateUser, getUsersList, getStoreList } from '@/api'; // 导入 API 函数
import md5 from '@/plugins/w_md5';
// 定义表格列的配置
const columns = [
    {
        title: 'ID', // 列标题
        dataIndex: 'id', // 数据索引
        width: '10%', // 列宽
    },
    {
        title: '用户名', // 列标题
        dataIndex: 'role', // 数据索引
        width: '15%', // 列宽
        scopedSlots: { customRender: 'role' }, // 自定义渲染
    },
    {
        title: '用户昵称', // 列标题
        dataIndex: 'nick_name', // 数据索引
        width: '15%', // 列宽
    },
    {
        title: '账号', // 列标题
        dataIndex: 'username', // 数据索引
        width: '15%', // 列宽
    },
    {
        title: '门店', // 列标题
        dataIndex: 'store_id', // 数据索引
        width: '25%', // 列宽
        scopedSlots: { customRender: 'store_id' }, // 自定义渲染
    },
    {
        title: '操作', // 列标题
        key: 'action', // 唯一键
        scopedSlots: { customRender: 'action' }, // 自定义渲染
    },
];

export default {
    data() {
        const role2 = localStorage.getItem('role') === '1';
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
            selectedItems: [],
            storeList: [],
            nick_name: undefined,
            role2,
            username: undefined,
        };
    },
    mounted() {
        this.fetch(); // 组件挂载后获取数据
        this.getStoreListFn(); // 组件挂载后获取门店数据
    },
    computed: {
        filteredOptions() {
            return this.storeList.filter(o => !this.selectedItems.some(selected => selected.key === o.id))
        }
    },
    methods: {
        changeIn(value) {
            this.form.setFieldsValue({role: value});
        },
        handleChange(selectedItems) {
            this.selectedItems = selectedItems;
        },
        // 获取门店数据
        async getStoreListFn() {
            try {
                const res = await getStoreList({
                    limit: 100,
                    page: 1,
                });
                this.storeList = res.rows.map(item => {
                    item.label = item.name;
                    item.value = item.id;
                    return item;
                });;
            } catch (error) {
                this.$message.error(error.message); // 显示错误消息
            }
        },
        // 显示添加或编辑用户的模态框
        showUser(row) {
            this.form.resetFields(); // 重置表单
            this.form.id = undefined; // 清空ID
            // this.selectedItems = [];
            this.visible = true; // 显示编辑模态框
            if (row && row.id) {
                this.title = "编辑"; // 设置标题为编辑
                setTimeout(() => {
                    this.form.id = row.id; // 设置ID
                    this.form.setFieldsValue({ // 设置表单字段值
                        role: row.role,
                        nick_name: row.nick_name,
                        password: '',
                    });
                    this.selectedItems = row.store_id.map(item => ({
                        key: item.id,
                        label: item.name
                    }));
                }, 100);
            } else {
                this.title = "新增"; // 设置标题为新增
                setTimeout(() => {
                    this.form.setFieldsValue({role: 2});
                }, 100);
            }
        },
        // 删除用户
        deleteUserFn(row) {
            this.$confirm({
                title: '是否要删除该用户？', // 确认框标题
                content: `当前选中ID是"${row.id}",用户名是"${row.nick_name}"`, // 确认框内容
                okText: '是', // 确认按钮文本
                okType: 'danger', // 确认按钮类型
                cancelText: '否', // 取消按钮文本
                onOk: () => {
                    deleteUser({ id: row.id }).then(() => {
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
            if (!params.nick_name) {
                delete params.nick_name;
            }
            if (!params.username) {
                delete params.username;
            }
            this.loading = true; // 设置加载状态
            getUsersList({
                limit: 10, // 每页大小
                page: 1, // 当前页
                ...params, // 其他参数
            }).then(res => {
                this.loading = false; // 取消加载状态
                this.data = res.rows // 设置表格数据
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
                    // if (this.form2.role !== 1 || !this.selectedItems.length) return this.$message.error('请选择门店');
                    this.confirmLoading = true; // 设置确认按钮加载状态
                    try {
                        if (this.form.id) {
                            values.id = this.form.id; // 设置ID
                            values.password = values.password && md5.hex_md5_32(values.password) || undefined;
                            values.store_id = this.selectedItems.map(item => item.key);
                            await updateUser(values); // 更新门店
                            this.$message.success('编辑成功'); // 显示成功消息
                        } else {
                            values.password = md5.hex_md5_32(values.password);
                            values.store_id = this.selectedItems.map(item => item.key);
                            await addUser(values); // 新增门店
                            this.$message.success('新增成功'); // 显示成功消息
                        }
                    } catch (error) {
                        this.$message.error(error.message); // 显示错误消息
                    } finally {
                        this.fetch(); // 重新获取数据
                        this.visible = false; // 关闭模态框
                        this.form.id = undefined; // 清空ID
                        this.selectedItems = [];
                        this.confirmLoading = false; // 取消确认按钮加载状态
                    }
                }
            });
        },
        // 取消模态框操作
        handleCancel() {
            this.visible = false; // 关闭模态框
            this.selectedItems = [];
            setTimeout(() => {
                this.form.resetFields(); // 重置表单
                this.form.id = undefined; // 清空ID
            }, 10);
        },
        reset() {
            this.nick_name = undefined;
            this.username = undefined;
            this.fetch();
        },
    },
};
</script>