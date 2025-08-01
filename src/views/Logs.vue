<template>
	<div>
		<!-- 搜索表单 -->
		<a-card class="mb-24" :bordered="false">
			<a-form layout="inline" :form="form">
				<a-form-item label="用户名">
					<a-input
						v-decorator="['username']"
						placeholder="请输入用户名"
						allowClear
					/>
				</a-form-item>
				<a-form-item label="操作类型">
					<a-select
						v-decorator="['action']"
						placeholder="请选择操作类型"
						style="width: 200px"
						allowClear
					>
						<a-select-option v-for="action in actions" :key="action" :value="action">
							{{ action }}
						</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item label="日期范围">
					<a-range-picker
						v-decorator="['dateRange']"
						:placeholder="['开始日期', '结束日期']"
					/>
				</a-form-item>
				<a-form-item>
					<a-button type="primary" @click="handleSearch">查询</a-button>
					<a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
				</a-form-item>
			</a-form>
		</a-card>

		<!-- 日志列表 -->
		<a-card :bordered="false">
			<a-table
				:columns="columns"
				:dataSource="logs"
				:pagination="pagination"
				:loading="loading"
				@change="handleTableChange"
			>
				<template slot="method" slot-scope="text">
					<a-tag :color="methodColors[text]">{{ text }}</a-tag>
				</template>
				<template slot="status" slot-scope="text">
					<a-tag :color="text === 200 ? 'green' : 'red'">{{ text }}</a-tag>
				</template>
			</a-table>
		</a-card>
	</div>
</template>

<script>
import { getLogs, getLogActions } from '@/api'
import dateUtils from '@/utils/dateUtils'

export default {
	data() {
		return {
			form: this.$form.createForm(this),
			loading: false,
			logs: [],
			actions: [],
			pagination: {
				current: 1,
				pageSize: 20,
				total: 0
			},
			columns: [
				{
					title: '用户名',
					dataIndex: 'username',
					key: 'username',
					width: 120
				},
				{
					title: '用户类型',
					dataIndex: 'userType',
					key: 'userType',
					width: 100
				},
				{
					title: '请求方法',
					dataIndex: 'method',
					key: 'method',
					width: 100,
					scopedSlots: { customRender: 'method' }
				},
				{
					title: '操作类型',
					dataIndex: 'action',
					key: 'action',
					width: 150
				},
				{
					title: '请求路径',
					dataIndex: 'path',
					key: 'path',
					width: 200
				},
				{
					title: 'IP地址',
					dataIndex: 'ip',
					key: 'ip',
					width: 120
				},
				{
					title: '状态码',
					dataIndex: 'status',
					key: 'status',
					width: 100,
					scopedSlots: { customRender: 'status' }
				},
				{
					title: '错误信息',
					dataIndex: 'error',
					key: 'error',
					width: 200
				},
				{
					title: '操作时间',
					dataIndex: 'createdAt',
					key: 'createdAt',
					width: 180
				}
			],
			methodColors: {
				GET: 'blue',
				POST: 'green',
				PUT: 'orange',
				DELETE: 'red'
			}
		}
	},
	methods: {
		// 格式化时间
		formatDateTime(dateTime) {
			if (!dateTime) return '-';
			try {
				// 使用utcToLocal方法处理UTC时间
				return dateUtils.utcToLocal(dateTime);
			} catch (error) {
				console.error('时间格式化错误:', error, dateTime);
				return String(dateTime);
			}
		},
		
		async fetchLogs() {
			try {
				this.loading = true
				const values = this.form.getFieldsValue()
				const params = {
					page: this.pagination.current,
					pageSize: this.pagination.pageSize,
					username: values.username,
					action: values.action
				}
				if (values.dateRange) {
					params.startDate = dateUtils.formatDate(values.dateRange[0])
					params.endDate = dateUtils.formatDate(values.dateRange[1])
				}
				const res = await getLogs(params)
				this.logs = res.data.list
				this.pagination.total = res.data.total
			} catch (error) {
				this.$message.error('获取日志列表失败')
			} finally {
				this.loading = false
			}
		},
		async fetchActions() {
			try {
				const res = await getLogActions()
				this.actions = res.data
			} catch (error) {
				this.$message.error('获取操作类型列表失败')
			}
		},
		handleSearch() {
			this.pagination.current = 1
			this.fetchLogs()
		},
		handleReset() {
			this.form.resetFields()
			this.pagination.current = 1
			this.fetchLogs()
		},
		handleTableChange(pagination) {
			this.pagination = pagination
			this.fetchLogs()
		}
	},
	created() {
		this.fetchLogs()
		this.fetchActions()
	}
}
</script>

<style scoped>
.mb-24 {
	margin-bottom: 24px;
}
</style>