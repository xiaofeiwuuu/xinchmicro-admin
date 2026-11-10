<!-- 
	This is the sign in page, it uses the dashboard layout in: 
	"./layouts/Default.vue" .
 -->

<template>
	<div class="sign-in">
		
		<a-row type="flex" :gutter="[24,24]" justify="space-around" align="middle">

			<!-- 登录表单列 -->
			<a-col :span="24" :md="12" :lg="{span: 12, offset: 0}" :xl="{span: 6, offset: 2}" class="col-form">
				<h1 class="mb-15">登录</h1>
				<h5 class="font-regular text-muted">输入您的账号和密码以登录</h5>

				<!-- 登录表单 -->
				<a-form
					id="components-form-demo-normal-login"
					:form="form"
					class="login-form"
					@submit="handleSubmit"
					:hideRequiredMark="true"
				>
					<a-form-item class="mb-10" label="账号" :colon="false">
						<a-input 
						v-decorator="[ 
						'username', 
						{ rules: [{ required: true, message: '请输入您的账号!' }] }, 
						]" placeholder="账号" />
					</a-form-item>
					<a-form-item class="mb-5" label="密码" :colon="false">
						<a-input
						v-decorator="[ 
						'password', 
						{ rules: [{ required: true, message: '请输入您的密码!' }] }, 
						]" type="password" placeholder="密码" />
					</a-form-item>
					<!-- <a-form-item class="mb-10">
						<a-switch v-model="rememberMe" /> 记住我
					</a-form-item> -->
					<a-form-item>
						<a-button type="primary" block html-type="submit" class="login-form-button" :loading="loading">
							登录
						</a-button>
					</a-form-item>
				</a-form>
				<!-- / 登录表单 -->
			</a-col>
			<!-- / 登录表单列 -->

			<!-- 登录图片列 -->
			<a-col :span="24" :md="12" :lg="12" :xl="12" class="col-img">
				<img src="images/img-signin.jpg" alt="">
			</a-col>
			<!-- 登录图片列 -->

		</a-row>
		
	</div>
</template>

<script>
import { notifyError } from '@/utils/notify';
import { saveAuth } from '@/utils/auth';
import { login } from '@/api'

export default ({
	data() {
		return {
			loading: false,
		}
	},
	beforeCreate() {
		this.form = this.$form.createForm(this, { name: 'normal_login' });
	},
	methods: {
		async handleSubmit(e) {
			e.preventDefault();
			this.form.validateFields(async (err, values) => {
				if (!err) {
					try {
						this.loading = true;
						const res = await login(values);
						
						// 存储登录信息到localStorage
						saveAuth(res.data.token, {
							id: res.data.user.id,
							username: res.data.user.username,
							userType: res.data.user.userType,
							roleId: res.data.user.roleId || null,
							permissions: res.data.user.permissions
						});
						
						this.$message.success(res.message || '登录成功');
						// 登录前想访问的页面（地址里的 redirect）：只认站内路径，防止被人构造链接登录后跳到别的网站
						const r = this.$route.query.redirect;
						this.$router.push(typeof r === 'string' && /^\/(?!\/)/.test(r) && !r.startsWith('/login') ? r : '/');
					} catch (error) {
						notifyError(this, error, '', '登录失败');
					} finally {
						this.loading = false;
					}
				}
			});
		},
	},
})
</script>

<style lang="scss">
	body {
		background-color: #ffffff;
	}
</style>