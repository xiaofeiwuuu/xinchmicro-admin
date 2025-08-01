<template>
	<div>
		<a-card :bordered="false" class="mb-24">
			<div class="flex-between">
				<div>
					<a-input-search
						placeholder="搜索用户名"
						style="width: 200px; margin-right: 16px;"
						@search="handleSearch"
						v-model="searchUsername"
					/>
					<a-select
						placeholder="账号类型"
						style="width: 120px; margin-right: 16px;"
						allowClear
						@change="handleTypeChange"
						v-model="searchUserType"
					>
						<a-select-option value="main">主账号</a-select-option>
						<a-select-option value="sub">子账号</a-select-option>
					</a-select>
					<a-button type="primary" @click="handleSearch">
						<a-icon type="search" /> 搜索
					</a-button>
				</div>
				<a-button type="primary" @click="showCreateUserModal('sub')">
					<a-icon type="plus" /> 创建子账号
				</a-button>
			</div>
		</a-card>

		<a-card :bordered="false">
			<a-table
				:columns="columns"
				:dataSource="users"
				:loading="loading"
				:pagination="pagination"
				@change="handleTableChange"
				rowKey="id"
			>
				<template slot="userType" slot-scope="text">
					<a-tag :color="text === 'main' ? 'blue' : 'green'">
						{{ text === 'main' ? '主账号' : '子账号' }}
					</a-tag>
				</template>
				<template slot="action" slot-scope="text, record">
					<a-space>
						<a @click="showEditUserModal(record)">编辑</a>
						<a-divider type="vertical" />
						<a @click="showChangePasswordModal(record)">修改密码</a>
						<a-divider type="vertical" v-if="currentUser.userType === 'main' && record.userType !== 'main'" />
						<a @click="showResetPasswordModal(record)" v-if="currentUser.userType === 'main' && record.userType !== 'main'">重置密码</a>
						<a-divider type="vertical" v-if="currentUser.userType === 'main' && record.id !== currentUser.id" />
						<a-popconfirm
							title="确定要删除此用户吗？"
							@confirm="handleDeleteUser(record.id)"
							okText="确定"
							cancelText="取消"
							v-if="currentUser.userType === 'main' && record.id !== currentUser.id"
						>
							<a class="text-danger">删除</a>
						</a-popconfirm>
					</a-space>
				</template>
			</a-table>
		</a-card>

		<!-- 创建用户模态框 -->
		<a-modal
			:title="userModalTitle"
			:visible="userModalVisible"
			@ok="handleCreateUser"
			@cancel="handleCancel"
			:confirmLoading="confirmLoading"
		>
			<a-form-model ref="userForm" :model="userForm" :rules="userRules">
				<a-form-model-item label="用户名" prop="username">
					<a-input v-model="userForm.username" placeholder="请输入用户名" />
				</a-form-model-item>
				<a-form-model-item label="密码" prop="password" v-if="!userForm.id">
					<a-input-password v-model="userForm.password" placeholder="请输入密码" />
				</a-form-model-item>
			</a-form-model>
		</a-modal>

		<!-- 修改密码模态框 -->
		<a-modal
			title="修改密码"
			:visible="passwordModalVisible"
			@ok="handleChangePassword"
			@cancel="handleCancel"
			:confirmLoading="confirmLoading"
		>
			<a-form-model ref="passwordForm" :model="passwordForm" :rules="passwordRules">
				<a-form-model-item label="旧密码" prop="oldPassword">
					<a-input-password v-model="passwordForm.oldPassword" placeholder="请输入旧密码" />
				</a-form-model-item>
				<a-form-model-item label="新密码" prop="newPassword">
					<a-input-password v-model="passwordForm.newPassword" placeholder="请输入新密码" />
				</a-form-model-item>
				<a-form-model-item label="确认新密码" prop="confirmPassword">
					<a-input-password v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
				</a-form-model-item>
			</a-form-model>
		</a-modal>

		<!-- 重置密码模态框 -->
		<a-modal
			title="重置密码"
			:visible="resetPasswordModalVisible"
			@ok="handleResetPassword"
			@cancel="handleCancel"
			:confirmLoading="confirmLoading"
		>
			<a-form-model ref="resetPasswordForm" :model="resetPasswordForm" :rules="resetPasswordRules">
				<a-form-model-item label="新密码" prop="newPassword">
					<a-input-password v-model="resetPasswordForm.newPassword" placeholder="请输入新密码" />
				</a-form-model-item>
				<a-form-model-item label="确认新密码" prop="confirmPassword">
					<a-input-password v-model="resetPasswordForm.confirmPassword" placeholder="请再次输入新密码" />
				</a-form-model-item>
			</a-form-model>
		</a-modal>
	</div>
</template>

<script>
import { 
	createMainUser, 
	createSubUser, 
	changePassword, 
	getUsers, 
	getUserById, 
	updateUser, 
	deleteUser, 
	resetUserPassword 
} from '@/api'
import dateUtils from '@/utils/dateUtils'

export default {
	data() {
		// 验证确认密码
		const validateConfirmPassword = (rule, value, callback) => {
			if (value !== this.passwordForm.newPassword) {
				callback(new Error('两次输入的密码不一致'));
			} else {
				callback();
			}
		};

		// 验证重置密码确认
		const validateResetConfirmPassword = (rule, value, callback) => {
			if (value !== this.resetPasswordForm.newPassword) {
				callback(new Error('两次输入的密码不一致'));
			} else {
				callback();
			}
		};

		return {
			loading: false,
			confirmLoading: false,
			searchUsername: '',
			searchUserType: undefined,
			users: [],
			pagination: {
				current: 1,
				pageSize: 10,
				total: 0,
				showTotal: total => `共 ${total} 条记录`
			},
			columns: [
				{
					title: 'ID',
					dataIndex: 'id',
					key: 'id'
				},
				{
					title: '用户名',
					dataIndex: 'username',
					key: 'username'
				},
				{
					title: '账号类型',
					dataIndex: 'userType',
					key: 'userType',
					scopedSlots: { customRender: 'userType' }
				},
				{
					title: '创建时间',
					dataIndex: 'createdAt',
					key: 'createdAt',
					render: undefined
				},
				{
					title: '操作',
					key: 'action',
					scopedSlots: { customRender: 'action' }
				}
			],
			userModalVisible: false,
			userModalType: 'edit', // 'main', 'sub' 或 'edit'
			userForm: {
				id: null,
				username: '',
				password: ''
			},
			userRules: {
				username: [
					{ required: true, message: '请输入用户名', trigger: 'blur' },
					{ min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
				],
				password: [
					{ required: true, message: '请输入密码', trigger: 'blur' },
					{ min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
				]
			},
			passwordModalVisible: false,
			currentUser: {
				id: null,
				username: '',
				userType: ''
			},
			targetUser: null,
			passwordForm: {
				oldPassword: '',
				newPassword: '',
				confirmPassword: ''
			},
			passwordRules: {
				oldPassword: [
					{ required: true, message: '请输入旧密码', trigger: 'blur' }
				],
				newPassword: [
					{ required: true, message: '请输入新密码', trigger: 'blur' },
					{ min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
				],
				confirmPassword: [
					{ required: true, message: '请再次输入新密码', trigger: 'blur' },
					{ validator: validateConfirmPassword, trigger: 'blur' }
				]
			},
			resetPasswordModalVisible: false,
			resetPasswordForm: {
				newPassword: '',
				confirmPassword: ''
			},
			resetPasswordRules: {
				newPassword: [
					{ required: true, message: '请输入新密码', trigger: 'blur' },
					{ min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
				],
				confirmPassword: [
					{ required: true, message: '请再次输入新密码', trigger: 'blur' },
					{ validator: validateResetConfirmPassword, trigger: 'blur' }
				]
			}
		}
	},
	computed: {
		userModalTitle() {
			if (this.userModalType === 'main') return '创建主账号';
			if (this.userModalType === 'sub') return '创建子账号';
			return '编辑用户';
		}
	},
	created() {
		// 从本地存储获取当前用户信息
		const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
		if (userInfo.id) {
			this.currentUser = {
				id: userInfo.id,
				username: userInfo.username,
				userType: userInfo.userType
			};
		}
		// 如果没有获取到用户信息，默认设置为主账号，确保按钮可见
		else {
			// 从sessionStorage中尝试获取
			const sessionUserInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
			if (sessionUserInfo.id) {
				this.currentUser = {
					id: sessionUserInfo.id,
					username: sessionUserInfo.username,
					userType: sessionUserInfo.userType
				};
			} else {
				// 如果仍然没有，设置为主账号
				this.currentUser = {
					id: 1,
					username: 'admin',
					userType: 'main'
				};
				console.warn('未找到用户信息，默认设置为主账号');
			}
		}
		this.fetchUsers();
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
		
		async fetchUsers(params = {}) {
			this.loading = true;
			try {
				const query = {
					page: this.pagination.current,
					pageSize: this.pagination.pageSize,
					...params
				};
				
				if (this.searchUsername) {
					query.username = this.searchUsername;
				}
				
				if (this.searchUserType) {
					query.userType = this.searchUserType;
				}
				
				const res = await getUsers(query);
				const { list, total, page, pageSize } = res.data;
				
				this.users = list;
				this.pagination.total = total;
				this.pagination.current = page;
				this.pagination.pageSize = pageSize;
			} catch (error) {
				this.$message.error(error.message || '获取用户列表失败');
			} finally {
				this.loading = false;
			}
		},
		handleTableChange(pagination) {
			this.pagination.current = pagination.current;
			this.fetchUsers();
		},
		handleSearch() {
			this.pagination.current = 1;
			this.fetchUsers();
		},
		handleTypeChange() {
			this.pagination.current = 1;
			this.fetchUsers();
		},
		showCreateUserModal(type) {
			this.userModalType = type;
			this.userForm = {
				id: null,
				username: '',
				password: ''
			};
			this.userModalVisible = true;
		},
		showEditUserModal(user) {
			this.userModalType = 'edit';
			this.userForm = {
				id: user.id,
				username: user.username
			};
			this.userModalVisible = true;
		},
		showChangePasswordModal(user) {
			this.targetUser = user;
			this.passwordForm = {
				oldPassword: '',
				newPassword: '',
				confirmPassword: ''
			};
			this.passwordModalVisible = true;
		},
		showResetPasswordModal(user) {
			this.targetUser = user;
			this.resetPasswordForm = {
				newPassword: '',
				confirmPassword: ''
			};
			this.resetPasswordModalVisible = true;
		},
		handleCancel() {
			this.userModalVisible = false;
			this.passwordModalVisible = false;
			this.resetPasswordModalVisible = false;
		},
		handleCreateUser() {
			this.$refs.userForm.validate(async valid => {
				if (valid) {
					try {
						this.confirmLoading = true;
						if (this.userModalType === 'main') {
							const res = await createMainUser(this.userForm);
							this.$message.success(res.message || '主账号创建成功');
							this.fetchUsers();
						} else if (this.userModalType === 'sub') {
							const res = await createSubUser(this.userForm);
							this.$message.success(res.message || '子账号创建成功');
							this.fetchUsers();
						} else {
							// 编辑用户
							const res = await updateUser(this.userForm.id, { username: this.userForm.username });
							this.$message.success(res.message || '用户信息更新成功');
							this.fetchUsers();
						}
						this.userModalVisible = false;
					} catch (error) {
						this.$message.error(error.message || '操作失败');
					} finally {
						this.confirmLoading = false;
					}
				}
			});
		},
		handleChangePassword() {
			this.$refs.passwordForm.validate(async valid => {
				if (valid) {
					try {
						this.confirmLoading = true;
						const res = await changePassword({
							oldPassword: this.passwordForm.oldPassword,
							newPassword: this.passwordForm.newPassword
						});
						this.$message.success(res.message || '密码修改成功');
						this.passwordModalVisible = false;
					} catch (error) {
						this.$message.error(error.message || '修改失败');
					} finally {
						this.confirmLoading = false;
					}
				}
			});
		},
		handleResetPassword() {
			this.$refs.resetPasswordForm.validate(async valid => {
				if (valid) {
					try {
						this.confirmLoading = true;
						const res = await resetUserPassword(this.targetUser.id, {
							newPassword: this.resetPasswordForm.newPassword
						});
						this.$message.success(res.message || '密码重置成功');
						this.resetPasswordModalVisible = false;
					} catch (error) {
						this.$message.error(error.message || '重置失败');
					} finally {
						this.confirmLoading = false;
					}
				}
			});
		},
		async handleDeleteUser(id) {
			try {
				this.loading = true;
				const res = await deleteUser(id);
				this.$message.success(res.message || '用户删除成功');
				this.fetchUsers();
			} catch (error) {
				this.$message.error(error.message || '删除失败');
			} finally {
				this.loading = false;
			}
		}
	}
}
</script>

<style scoped>
.mb-24 {
	margin-bottom: 24px;
}
.flex-between {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.text-danger {
	color: #f5222d;
}
</style> 