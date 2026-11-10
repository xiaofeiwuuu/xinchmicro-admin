<template>
	<div>
		<!-- 搜索表单 -->
		<a-card class="mb-24" :bordered="false">
			<!-- 日志分两类：后台账号的操作 / 小程序用户的操作，不混在一起 -->
			<div class="log-tabs">
				<a-radio-group :value="source" button-style="solid" @change="onSourceChange">
					<a-radio-button value="admin">后台日志</a-radio-button>
					<a-radio-button value="user">用户日志</a-radio-button>
				</a-radio-group>
				<span class="log-tip">{{ source === 'user' ? '小程序客户的操作（下单、改资料、申请售后等）和微信支付回调，客户显示为「客户#编号」' : '后台账号的操作（新增、修改、删除、发货、开票等）' }}</span>
			</div>
			<a-form layout="inline" :form="form">
				<a-form-item :label="source === 'user' ? '客户' : '用户名'">
					<a-input
						v-decorator="['username']"
						:placeholder="source === 'user' ? '客户#编号' : '请输入用户名'"
						style="width: 160px"
						allowClear
					/>
				</a-form-item>
				<a-form-item label="操作类型">
					<a-select
						v-decorator="['action']"
						placeholder="请选择操作类型"
						style="width: 160px"
						allowClear
					>
						<a-select-option v-for="action in actions" :key="action" :value="action">
							{{ action }}
						</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item label="日期范围">
					<date-range-quick v-model="dates" @change="handleSearch" />
				</a-form-item>
				<a-form-item>
					<a-button type="primary" @click="handleSearch">查询</a-button>
					<a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
					<a-button style="margin-left: 24px" type="danger" ghost :loading="cleaning" title="后台日志和用户日志一起清理" @click="handleCleanup">清理一个月前的日志</a-button>
				</a-form-item>
			</a-form>
		</a-card>

		<!-- 日志列表 -->
		<a-card :bordered="false">
			<a-table :scroll="tableScroll"
				rowKey="id"
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
import { notifyError } from '@/utils/notify';
import { getLogs, getLogActions, previewLogCleanup, cleanupLogs } from '@/api'
import dateUtils from '@/utils/dateUtils'
import DateRangeQuick from '@/components/DateRangeQuick.vue'
import fetchWrapper from '@/plugins/fetchWrapper'

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
	components: { DateRangeQuick },
	data() {
		return {
			form: this.$form.createForm(this),
			dates: [],
			loading: false,
			cleaning: false,
			source: 'admin', // admin 后台日志 / user 用户日志
			logs: [],
			actions: [],
			pagination: newPagination(),
			baseColumns: [
				{
					title: '用户名',
					dataIndex: 'username',
					key: 'username',
					customRender: (v) => v || '-'
				},
				{
					title: '用户类型',
					dataIndex: 'userType',
					key: 'userType',
					customRender: (v) => ({ main: '主账号', sub: '子账号', customer: '小程序用户' }[v] || v || '-')
				},
				{
					title: '请求方法',
					dataIndex: 'method',
					key: 'method',
					scopedSlots: { customRender: 'method' }
				},
				{
					title: '操作类型',
					dataIndex: 'action',
					key: 'action',
				},
				{
					title: '请求路径',
					dataIndex: 'path',
					key: 'path',
				},
				{
					title: 'IP地址',
					dataIndex: 'ip',
					key: 'ip',
				},
				{
					title: '状态码',
					dataIndex: 'status',
					key: 'status',
					scopedSlots: { customRender: 'status' }
				},
				{
					title: '错误信息',
					dataIndex: 'error',
					key: 'error',
				},
				{
					title: '操作时间',
					dataIndex: 'createdAt',
					key: 'createdAt',
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
	computed: {
		// 用户日志里的「用户」是小程序客户，类型都一样，不显示类型这一列
		columns() {
			if (this.source !== 'user') return this.baseColumns
			return this.baseColumns.filter((c) => c.key !== 'userType').map((c) => (c.key === 'username' ? { ...c, title: '客户' } : c))
		}
	},
	methods: {
		// 切换后台日志 / 用户日志：筛选条件清空，从第一页开始
		onSourceChange(e) {
			this.source = e.target.value
			this.form.resetFields()
			this.dates = []
			this.pagination.current = 1
			this.actions = []
			this.fetchLogs()
			this.fetchActions()
		},
		// 格式化时间
		formatDateTime(dateTime) {
			if (!dateTime) return '-';
			try {
				// 使用utcToLocal方法处理UTC时间
				return dateUtils.utcToLocal(dateTime);
			} catch (error) {
				return String(dateTime);
			}
		},
		
		async fetchLogs() {
			try {
				this.loading = true
				const values = this.form.getFieldsValue()
				const params = {
					source: this.source,
					page: this.pagination.current,
					pageSize: this.pagination.pageSize,
					username: values.username,
					action: values.action
				}
				if (this.dates.length === 2) {
					params.startDate = dateUtils.formatDate(this.dates[0])
					params.endDate = dateUtils.formatDate(this.dates[1])
				}
				const res = await getLogs(params)
				this.logs = res.data.list
				this.pagination.total = res.data.total
			} catch (error) {
				notifyError(this, error, '获取日志列表失败')
			} finally {
				this.loading = false
			}
		},
		async fetchActions() {
			try {
				const res = await getLogActions(this.source)
				this.actions = res.data
			} catch (error) {
				notifyError(this, error, '获取操作类型列表失败')
			}
		},
		handleSearch() {
			this.pagination.current = 1
			this.fetchLogs()
		},
		handleReset() {
			this.form.resetFields()
			this.dates = []
			this.pagination.current = 1
			this.fetchLogs()
		},
		// 清理一个月前的日志：先问服务端有多少条，让用户确认数量后再永久删除
		async handleCleanup() {
			if (this.cleaning) return
			this.cleaning = true
			let preview
			try {
				const res = await previewLogCleanup()
				preview = res.data
			} catch (error) {
				notifyError(this, error, '获取待清理日志数量失败')
				return
			} finally {
				this.cleaning = false
			}
			if (!preview || !preview.count) {
				this.$message.info('没有一个月前的日志，无需清理')
				return
			}
			this.$confirm({
				title: '清理一个月前的日志',
				content: `将永久删除 ${fetchWrapper.formatISODate(preview.before)} 之前的 ${preview.count} 条日志，删除后无法恢复。`,
				okText: '确认删除',
				okType: 'danger',
				cancelText: '取消',
				onOk: async () => {
					try {
						const res = await cleanupLogs()
						this.$message.success(res.message || '清理完成')
						this.pagination.current = 1
						this.fetchLogs()
						this.fetchActions()
					} catch (error) {
						notifyError(this, error, '清理日志失败')
					}
				}
			})
		},
		handleTableChange(pagination) {
			applyTableChange(this.pagination, pagination)
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
.log-tabs { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.log-tip { color: #8c8c8c; font-size: 13px; }
</style>