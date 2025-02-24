<template>
    <div>
        <a-range-picker @change="onChange" />
        <!-- 表格组件，显示门店数据 -->
        <a-table :columns="columns" :data-source="data" :pagination="pagination" :loading="loading" rowKey="id"
            @change="handleTableChange">
            <span slot="operate_at" slot-scope="text, record">
                {{ timestampToTime(record.operate_at) }}
            </span>
            <span slot="qr_code" slot-scope="text, record">
                <img :src="record.qr_code" v-if="record.qr_code" :alt="record.name" @click="previewFn(record.qr_code)"
                    style="width: 48px; height: 48px;">
            </span>
        </a-table>
    </div>
</template>

<script>
import { getLogsList } from '@/api'; // 导入 API 函数
// 定义表格列的配置
const columns = [
    {
        title: 'ID', // 列标题
        dataIndex: 'id', // 数据索引
        width: '15%', // 列宽
    },
    {
        title: '操作者', // 列标题
        dataIndex: 'operate_by', // 数据索引
        width: '20%', // 列宽
    },
    {
        title: '操作地点', // 列标题
        dataIndex: 'ip', // 数据索引
        width: '20%', // 列宽
    },
    {
        title: '操作', // 列标题
        dataIndex: 'operate', // 数据索引
        width: '20%', // 列宽
    },
    {
        title: '操作时间', // 列标题
        dataIndex: 'operate_at', // 数据索引
        width: '20%', // 列宽
        scopedSlots: { customRender: 'operate_at' }, // 自定义渲染  
    },
];

export default {
    data() {
        return {
            data: [], // 表格数据
            pagination: {
                pageSize: 10, // 每页大小
                current: 1, // 当前页
                total: 0, // 总记录数
                start_time: undefined, // 开始时间
                end_time: undefined, // 结束时间
            },
            loading: false, // 加载状态
            columns, // 表格列配置
        };
    },
    mounted() {
        this.fetch(); // 组件挂载后获取数据
    },
    methods: {
        onChange(date, dateString) {
            console.log(dateString);
            this.pagination.start_time = new Date(dateString[0] + ' 00:00:00').getTime() / 1000;
            this.pagination.end_time = new Date(dateString[1] + ' 23:59:59').getTime() / 1000;
            this.fetch(); // 重新获取数据
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
        fetch() {
            this.loading = true; // 设置加载状态
            const data = {
                limit: 10,
                page: this.pagination.current,
            }
            if(this.pagination.start_time && this.pagination.end_time) {
                data.start_time = this.pagination.start_time;
                data.end_time = this.pagination.end_time;
            }
            getLogsList(data).then(res => {
                this.loading = false; // 取消加载状态
                this.data = res.rows; // 设置表格数据
                this.pagination.total = res.count; // 更新分页信息
            }).catch(error => {
                this.loading = false; // 取消加载状态
                this.$message.error('获取数据失败'); // 显示错误消息
            });
        },
        // 时间戳转时间
        timestampToTime(timestamp) {
            return new Date(timestamp * 1000).toLocaleString(); // 转换为时间字符串
        },
    },
};
</script>