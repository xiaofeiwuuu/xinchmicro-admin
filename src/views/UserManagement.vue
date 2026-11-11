<template>
	<div>
		<a-card :bordered="false" class="mb-24">
			<div class="flex-between">
				<div>
					<a-input-search
						placeholder="搜索用户名"
						style="width: 160px; margin-right: 16px;"
						@search="handleSearch"
						v-model="searchUsername"
					/>
					<a-select
						placeholder="账号类型"
						style="width: 160px; margin-right: 16px;"
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
			<a-table :scroll="tableScroll"
				:columns="columns"
				:dataSource="users"
				:loading="loading"
				:pagination="pagination"
				@change="handleTableChange"
				rowKey="id"
			>
				<template slot="username" slot-scope="text">
					<span class="copy-cell" title="点击复制" @click="copyText(text)">{{ text }}</span>
				</template>
				<template slot="userType" slot-scope="text, record">
					<a-tag :color="text === 'main' ? 'blue' : 'green'">
						{{ text === 'main' ? '主账号' : '子账号' }}
					</a-tag>
					<div class="role-line">
						<span v-if="record.userType === 'main'" class="muted">全部功能</span>
						<span v-else-if="record.roleName">{{ record.roleName }}</span>
						<span v-else class="muted">原有权限（没有设置角色）</span>
					</div>
				</template>
				<template slot="remark" slot-scope="text">
					<span v-if="text" class="remark-text" :title="text">{{ text }}</span>
					<span v-else class="muted">-</span>
				</template>
				<template slot="action" slot-scope="text, record">
					<a-space :style="{ flexWrap: 'wrap' }">
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
			<a-form-model ref="userForm" :model="userForm" :rules="userRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
				<a-form-model-item label="用户名" prop="username">
					<a-input v-model="userForm.username" placeholder="请输入用户名" />
				</a-form-model-item>
				<a-form-model-item label="密码" prop="password" v-if="!userForm.id">
					<a-input-password v-model="userForm.password" placeholder="请输入密码" />
				</a-form-model-item>
				<!-- 角色：只有主账号能设置，只能设在子账号上（主账号拥有全部功能） -->
				<a-form-model-item v-if="showRoleField" prop="roleId">
					<span slot="label">角色 <a-tooltip title="必选。这个账号只能使用角色里勾选的功能。角色在「角色管理」里配置。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
					<a-select v-model="userForm.roleId" placeholder="请选择角色" style="width: 100%">
						<a-select-option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</a-select-option>
					</a-select>
				</a-form-model-item>
				<a-form-model-item label="备注" v-if="currentUser.userType === 'main'">
					<a-input v-model="userForm.remark" :maxLength="200" placeholder="比如：仓库小王在用" />
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
			<a-form-model ref="passwordForm" :model="passwordForm" :rules="passwordRules" :label-col="{ span: 7 }" :wrapper-col="{ span: 17 }">
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
			<a-form-model ref="resetPasswordForm" :model="resetPasswordForm" :rules="resetPasswordRules" :label-col="{ span: 7 }" :wrapper-col="{ span: 17 }">
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
import { notifyError } from '@/utils/notify';
import { copyToClipboard } from '@/utils/copy';
import { getUserInfo } from '@/utils/auth';
import { 
	createMainUser, 
	createSubUser, 
	changePassword, 
	getUsers, 
	getUserById, 
	updateUser, 
	deleteUser, 
	resetUserPassword,
	getRoles
} from '@/api'
import dateUtils from '@/utils/dateUtils'

import fixedListLayout from '@/mixins/fixedListLayout'
import { newPagination, applyTableChange } from '@/utils/pagination'

export default {
	mixins: [fixedListLayout],
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
			pagination: newPagination(),
			columns: [
				{
					title: '用户名',
					dataIndex: 'username',
					key: 'username',
					scopedSlots: { customRender: 'username' }
				},
				{
					title: '账号类型 / 角色',
					dataIndex: 'userType',
					key: 'userType',
					scopedSlots: { customRender: 'userType' }
				},
				{
					title: '备注',
					dataIndex: 'remark',
					key: 'remark',
					scopedSlots: { customRender: 'remark' }
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
			roles: [],
			userForm: {
				id: null,
				username: '',
				password: '',
				roleId: undefined,
				remark: '',
				userType: ''
			},
			userRules: {
				username: [
					{ required: true, message: '请输入用户名', trigger: 'blur' },
					{ min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
				],
				password: [
					{ required: true, message: '请输入密码', trigger: 'blur' },
					{ min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
				],
				roleId: [{ required: true, message: '请选择角色', trigger: 'change' }]
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
		// 创建子账号、编辑子账号时显示角色；编辑主账号不显示（主账号拥有全部功能）。只有主账号能打开这个页面设置
		showRoleField() {
			if (this.currentUser.userType !== 'main') return false;
			return this.userModalType === 'sub' || (this.userModalType === 'edit' && this.userForm.userType === 'sub');
		},
		userModalTitle() {
			if (this.userModalType === 'main') return '创建主账号';
			if (this.userModalType === 'sub') return '创建子账号';
			return '编辑用户';
		}
	},
	created() {
		// 取不到用户信息时 currentUser 保持默认值（非主账号），不再默认当成管理员显示操作按钮
		const userInfo = getUserInfo();
		if (userInfo.id) {
			this.currentUser = { id: userInfo.id, username: userInfo.username, userType: userInfo.userType };
		}
		this.fetchUsers();
		this.fetchRoles();
	},
	methods: {
		// 点击复制（页面文字默认不能选中，需要复制的字段用点击复制）
		async copyText(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制：' + text);
			else this.$message.warning('复制失败，请手动复制');
		},
		async fetchRoles() {
			if (this.currentUser.userType !== 'main') return;
			try {
				this.roles = await getRoles();
			} catch (error) {
				// 取不到角色只是少了下拉选项，不影响账号管理
			}
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
				notifyError(this, error, '', '获取用户列表失败');
			} finally {
				this.loading = false;
			}
		},
		handleTableChange(pagination) {
			applyTableChange(this.pagination, pagination);
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
				password: '',
				roleId: undefined,
				remark: '',
				userType: type
			};
			this.userModalVisible = true;
		},
		showEditUserModal(user) {
			this.userModalType = 'edit';
			this.userForm = {
				id: user.id,
				username: user.username,
				roleId: user.roleId || undefined,
				remark: user.remark || '',
				userType: user.userType
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
							const res = await createSubUser({ username: this.userForm.username, password: this.userForm.password, roleId: this.userForm.roleId || null, remark: (this.userForm.remark || '').trim() });
							this.$message.success(res.message || '子账号创建成功');
							this.fetchUsers();
						} else {
							// 编辑用户
							const body = { username: this.userForm.username, remark: (this.userForm.remark || '').trim() };
							// 角色只有主账号能改，只能改子账号的；清空 = 取消角色（回到原有权限）
							if (this.showRoleField) body.roleId = this.userForm.roleId || null;
							const res = await updateUser(this.userForm.id, body);
							this.$message.success(res.message || '用户信息更新成功');
							this.fetchUsers();
						}
						this.userModalVisible = false;
					} catch (error) {
						notifyError(this, error, '', '操作失败');
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
						notifyError(this, error, '', '修改失败');
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
						notifyError(this, error, '', '重置失败');
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
				notifyError(this, error, '', '删除失败');
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
.muted { color: #8c8c8c; }
.copy-cell { cursor: pointer; }
.copy-cell:hover { color: #1890ff; }
.role-line { margin-top: 2px; font-size: 13px; }
.remark-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-all; }
>>> .ant-table a { white-space: nowrap; }
.help-icon { color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
</style> 