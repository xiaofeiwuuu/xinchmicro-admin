<template>
    <div>
        <!-- <div class="flex items-center gap-2" style="display: flex;margin-bottom: 10px;">
            <a-select allowClear size="small" default-value="是否热图" style="width: 160px;margin-right: 10px;"
                @change="changeIn">
                <a-select-option :value="1">
                    是
                </a-select-option>
                <a-select-option :value="2">
                    否
                </a-select-option>
            </a-select>
            <div>
                <a-button icon="search" size="small" style="margin-right: 10px;"
                    @click="fetch({ is_hot_image: is_hot_image, id: id })">
                    搜索
                </a-button>
            </div>
        </div> -->
        <!-- 新增图片按钮 -->
        <a-button type="primary" icon="plus" size="small" @click="showImage(undefined)">
            新增
        </a-button>
        <a-button type="danger" style="margin-left: 10px;" icon="minus" size="small" @click="deleteSelectImageFn">
            批量删除
        </a-button>
        <a-button type="danger" style="margin-left: 10px;" icon="close" size="small" @click="deleteSelectImageAllFn">
            删除所有
        </a-button>
        <!-- 表格组件，显示图片数据 -->
        <a-table :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }" :columns="columns"
            :data-source="data" :pagination="pagination" :loading="loading" rowKey="id" @change="handleTableChange">
            <span slot="image_url" slot-scope="text, record">
                <img :src="record.image_url" @click="handlePreview({ url: record.image_url })" :alt="record.description"
                    style="width: 64px; height: 64px;">
            </span>
            <!-- <span slot="store_id" slot-scope="text, record">
                <a-tag color="blue">
                    {{ record.store_id.name }}
                </a-tag>
            </span> -->
            <span slot="action" slot-scope="text, record,index">
                <!-- 编辑按钮 -->
                <a-button type="link" @click="setImagePageOrderFn({ image_id: record.id, move_type: 1 })">
                    <svg t="1731241092809" class="icon" viewBox="0 0 1024 1024" version="1.1"
                        xmlns="http://www.w3.org/2000/svg" p-id="10370" width="16" height="16">
                        <path
                            d="M554.403 285.884l384.93 393.728c23.166 23.694 22.737 61.682-0.958 84.847a60 60 0 0 1-41.945 17.097H126.57c-33.138 0-60-26.863-60-60a60 60 0 0 1 17.096-41.944l384.931-393.728c23.165-23.695 61.153-24.124 84.847-0.96 0.324 0.317 0.643 0.636 0.959 0.96z"
                            fill="#8C8C8C" p-id="10371"></path>
                    </svg>
                    <span class="text-dark">上移</span>
                </a-button>
                <a-button type="link" size="small" @click="setImagePageOrderFn({ image_id: record.id, move_type: 2 })">
                    <svg t="1731241146168" class="icon" viewBox="0 0 1024 1024" version="1.1"
                        xmlns="http://www.w3.org/2000/svg" p-id="10536" width="16" height="16">
                        <path
                            d="M554.403 737.672l384.93-393.728c23.166-23.694 22.737-61.682-0.958-84.847A60 60 0 0 0 896.43 242H126.57c-33.138 0-60 26.863-60 60a60 60 0 0 0 17.096 41.944l384.931 393.728c23.165 23.695 61.153 24.124 84.847 0.96 0.324-0.317 0.643-0.636 0.959-0.96z"
                            fill="#8C8C8C" p-id="10537"></path>
                    </svg>
                    <span class="text-dark">下移</span>
                </a-button>
                <a-button type="link" size="small" @click="showImage(record)">
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
                <a-button type="link" size="small" @click="editImageFn(record)">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path class="fill-muted"
                            d="M13.5858 3.58579C14.3668 2.80474 15.6332 2.80474 16.4142 3.58579C17.1953 4.36683 17.1953 5.63316 16.4142 6.41421L15.6213 7.20711L12.7929 4.37868L13.5858 3.58579Z"
                            fill="#111827" />
                        <path class="fill-muted"
                            d="M11.3787 5.79289L3 14.1716V17H5.82842L14.2071 8.62132L11.3787 5.79289Z" fill="#111827" />
                    </svg>
                    <span class="text-dark">编辑热区</span>
                </a-button>
                <a-divider type="vertical" />
                <!-- 删除按钮 -->
                <a-button type="link" size="small" @click="deleteImageFn(record)">
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
                <a-form-item class="mb-10" label="图片名称" :colon="false">
                    <a-input v-decorator="['image_name']" placeholder="图片名称" />
                </a-form-item>
                <a-form-item class="mb-5" label="图片描述" :colon="false">
                    <a-textarea v-decorator="['description']" placeholder="请输入图片描述"
                        :auto-size="{ minRows: 3, maxRows: 5 }" />
                </a-form-item>
                <a-form-item class="mb-10" label="图片类型" :colon="false">
                    <a-select v-decorator="['image_type']" allowClear size="small" style="width: 100%"
                        @change="changeImageType">
                        <a-select-option :value="1">
                            封面
                        </a-select-option>
                        <a-select-option :value="2">
                            主目录
                        </a-select-option>
                        <a-select-option :value="3">
                            次目录
                        </a-select-option>
                        <a-select-option :value="4">
                            详情
                        </a-select-option>
                    </a-select>
                </a-form-item>
                <a-form-item class="mb-10" label="图片" :colon="false" v-if="title !== '编辑'">
                    <!-- <a-upload :headers="headers" action="https://emenu.scszyy.cn/api/resource/upload" -->
                    <a-upload :headers="headers" :action="API_BASE_URL + '/resource/upload'" :multiple="true"
                        list-type="picture-card" :file-list="fileList" @preview="handlePreview"
                        @change="handleChangeImage">
                        <div v-if="fileList.length < 9">
                            <a-icon type="plus" />
                            <div class="ant-upload-text">
                                上传
                            </div>
                        </div>
                    </a-upload>
                </a-form-item>
            </a-form>
        </a-modal>

        <!-- 编辑图片热区模态框 -->
        <a-drawer width="100vw" :maskClosable="false" title="编辑热区" placement="left" :closable="false"
            :visible="editVisible" :after-visible-change="afterVisibleChange" @close="handleEditCancel">
            <editImage v-if="editVisible" @cancel="handleEditCancel" :id="selectedImage.id"
                :imageUrl="selectedImage.image_url" :hot_area_data="selectedImage.hot_area_data" :allData="allData" />
        </a-drawer>
        <!-- 图片预览模态框 -->
        <a-modal :visible="previewVisible" :footer="null" @cancel="handleCancel2" :zIndex="1002">
            <img alt="example" style="width: 100%;max-width: 80vw;max-height: 80vh;" :src="previewImage" />
        </a-modal>
    </div>
</template>

<script>
import { API_BASE_URL, addImage, deleteImage, updateImage, getImageList, setImagePageOrder, deleteImageAll } from '@/api'; // 导入 API 函数
import editImage from '@/components/editImage.vue'; // 导入编辑图片组件

// 定义表格列的配置
const columns = [
    {
        title: 'ID', // 列标题
        dataIndex: 'id', // 数据索引
        width: '10%', // 列宽
    },
    {
        title: '图片', // 列标题
        dataIndex: 'image_url', // 数据索引
        width: '10%', // 列宽
        scopedSlots: { customRender: 'image_url' }, // 自定义渲染
    },
    {
        title: '图片名称', // 列标题
        dataIndex: 'image_name', // 数据索引
        width: '10%', // 列宽
    },
    {
        title: '图片描述', // 列标题
        dataIndex: 'description', // 数据索引
        width: '15%', // 列宽
    },
    {
        title: '操作', // 列标题
        key: 'action', // 唯一键
        scopedSlots: { customRender: 'action' }, // 自定义渲染
    },
];

export default {
    data() {
        let headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers = {
                Authorization: JSON.parse(token)
            }
        }
        return {
            title: "新增", // 模态框标题
            maxTagCount: 2, // 最大标签数
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
            previewVisible: false, // 图片预览可见性
            previewImage: '', // 预览图片的 URL
            fileList: [], // 上传的文件列表
            headers,
            API_BASE_URL, // API 基础 URL
            editVisible: false, // 编辑图片热区模态框可见性
            selectedImage: {}, // 当前选中的图片
            // is_hot_image: null, // 是否是热图
            allData: [], // 所有数据
            selectedRowKeys: [], // 选中的行键
        };
    },
    components: {
        editImage // 注册编辑图片组件
    },
    props: {
        id: {
            type: Number,
            default: null
        }
    },
    watch: {
        id: {
            immediate: true,
            handler(newVal) {
                this.fetch({ id: newVal }); // 监听id变化，重新获取数据
                this.getImageListFn()
            }
        }
    },
    methods: {
        changeImageType(value) {
            console.log(value);
        },
        onSelectChange(selectedRowKeys) {
            this.selectedRowKeys = selectedRowKeys;
        },
        getImageListFn() {
            getImageList({
                limit: 999, // 每页大小
                page: 1, // 当前页
                id: this.id
            }).then(res => {
                this.allData = res.rows; // 设置表格数据
            }).catch(error => {
                // this.$message.error('获取数据失败'); // 显示错误消息
            });
        },
        setImagePageOrderFn(data) {
            setImagePageOrder(data).then(() => {
                this.fetch({ id: this.id })
                this.$message.success('设置成功'); // 显示成功消息
            }).catch(error => {
                this.$message.error(error.message); // 显示错误消息
            });
        },
        getBase64(file) {
            // 将文件转换为 Base64 格式
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        },
        afterVisibleChange(val) {
            // 处理可见性变化
        },
        editImageFn(record) {
            // 显示编辑图片热区模态框
            this.editVisible = true;
            this.selectedImage = record; // 设置当前选中的图片
        },
        handleEditCancel() {
            // 关闭编辑模态框
            this.editVisible = false;
            this.selectedImage = {}; // 清空选中的图片
            this.getImageListFn()
            this.fetch({ id: this.id })
        },
        handleCancel2() {
            // 关闭预览模态框
            this.previewVisible = false;
        },
        async handlePreview(file) {
            // 处理图片预览
            this.previewImage = '';
            if (!file.url && !file.preview) {
                file.preview = await this.getBase64(file.originFileObj);
            }
            this.previewImage = file.url || file.preview; // 设置预览图片
            this.previewVisible = true; // 显示预览模态框
        },
        handleChangeImage({ fileList }) {
            // 处理图片上传变化
            this.fileList = fileList; // 更新文件列表
        },
        showImage(row) {
            // 显示添加或编辑用户的模态框
            this.form.resetFields(); // 重置表单
            this.form.id = undefined; // 清空ID
            this.visible = true; // 显示编辑模态框
            if (row && row.id) {
                this.title = "编辑"; // 设置标题为编辑
                setTimeout(() => {
                    this.form.id = row.id; // 设置ID
                    this.form.setFieldsValue({ // 设置表单字段值
                        description: row.description,
                        image_type: row.image_type,
                        image_name: row.image_name,
                    });
                }, 100);
            } else {
                this.title = "新增"; // 设置标题为新增
            }
        },
        deleteImageFn(row) {
            // 删除用户
            this.$confirm({
                title: '是否要删除该图片？', // 确认框标题
                content: `当前选中ID是"${row.id}"的图片,请确认!`, // 确认框内容
                okText: '是', // 确认按钮文本
                okType: 'danger', // 确认按钮类型
                cancelText: '否', // 取消按钮文本
                onOk: () => {
                    // 确认删除操作
                    deleteImage({ id: [row.id], store_id: this.id }).then(() => {
                        this.$message.success('删除成功'); // 显示成功消息
                        this.fetch({ id: this.id }); // 重新获取数据
                        this.getImageListFn()
                    }).catch((error) => {
                        this.$message.error(error.message); // 显示错误消息
                    });
                },
                onCancel: () => {
                    this.$message.info('取消删除'); // 显示取消消息
                },
            });
        },
        deleteSelectImageFn() {
            if (this.selectedRowKeys.length === 0) return this.$message.error('请选择图片'); // 显示错误消息
            // 删除用户
            this.$confirm({
                title: '是否要删除选中的图片？', // 确认框标题
                content: `当前选中ID是"${[...this.selectedRowKeys].join(',')}"的图片,请确认!`, // 确认框内容
                okText: '是', // 确认按钮文本
                okType: 'danger', // 确认按钮类型
                cancelText: '否', // 取消按钮文本
                onOk: () => {
                    // 确认删除操作
                    deleteImage({ id: this.selectedRowKeys, store_id: this.id }).then(() => {
                        this.$message.success('删除成功'); // 显示成功消息
                        this.fetch({ id: this.id }); // 重新获取数据
                        this.selectedRowKeys = [];
                        this.getImageListFn()
                    }).catch((error) => {
                        this.$message.error(error.message); // 显示错误消息
                        this.selectedRowKeys = [];
                    });
                },
                onCancel: () => {
                    this.$message.info('取消删除'); // 显示取消消息
                },
            });
        },
        deleteSelectImageAllFn() {
            this.$confirm({
                title: '是否要删除所有的图片？', // 确认框标题
                content: `删除所有的图片,请确认!`, // 确认框内容
                okText: '是', // 确认按钮文本
                okType: 'danger', // 确认按钮类型
                cancelText: '否', // 取消按钮文本
                onOk: () => {
                    // 确认删除操作
                    deleteImageAll({ store_id: this.id }).then(() => {
                        this.$message.success('删除成功'); // 显示成功消息
                        this.fetch({ id: this.id }); // 重新获取数据
                        this.getImageListFn()
                    }).catch((error) => {
                        this.$message.error(error.message); // 显示错误消息
                    });
                },
                onCancel: () => {
                    this.$message.info('取消删除'); // 显示取消消息
                },
            });
        },
        handleTableChange(pagination) {
            // 表格变化处理
            const pager = { ...pagination }; // 复制当前分页信息
            this.pagination = pager; // 更新分页信息
            this.fetch({
                limit: pagination.pageSize, // 每页大小
                page: pagination.current, // 当前页
                id: this.id
            });
        },
        fetch(params = {}) {
            this.loading = true; // 设置加载状态
            getImageList({
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
        handleOk() {
            this.form.validateFields(async (err, values) => {
                if (!err) {
                    this.confirmLoading = true; // 设置确认按钮加载状态
                    try {
                        if (this.form.id) {
                            values.id = this.form.id; // 设置ID
                            // values.page_order = Number(values.page_order);
                            values.store_id = this.id
                            await updateImage(values); // 更新门店
                            this.$message.success('编辑成功'); // 显示成功消息
                        } else {
                            if (!this.fileList.length || !this.fileList[0].response) return this.$message.error('请上传图片');
                            // values.page_order = Number(values.page_order);
                            values.store_id = this.id
                            values.image_url = this.fileList.map(item => item.response?.data.photo_url);
                            await addImage(values); // 新增图片
                            this.$message.success('新增成功'); // 显示成功消息
                        }
                    } catch (error) {
                        this.$message.error(error.message); // 显示错误消息
                    }
                    this.fetch({ id: this.id }); // 重新获取数据
                    this.getImageListFn()
                    this.visible = false; // 关闭模态框
                    this.form.id = undefined; // 清空ID
                    this.fileList = [];
                    this.confirmLoading = false; // 取消确认按钮加载状态
                }
            });
        },
        handleCancel() {
            this.visible = false; // 关闭模态框
            this.fileList = [];
            setTimeout(() => {
                this.form.resetFields(); // 重置表单
                this.form.id = undefined; // 清空ID
            }, 100);
        },
    },
};
</script>