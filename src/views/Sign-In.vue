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
						<a-button type="primary" block html-type="submit" class="login-form-button">
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
	import { Login, getUserInfo } from '@/api';
	import md5 from '@/plugins/w_md5';
	export default ({
		data() {
			return {
				// 绑定的模型属性，用于“登录表单”的“记住我”开关按钮。
				rememberMe: true,
			}
		},
		beforeCreate() {
			// 创建表单并将其添加到组件的“form”属性中。
			this.form = this.$form.createForm(this, { name: 'normal_login' });
		},
		methods: {
			// 处理提交后的输入验证。
			handleSubmit(e) {
				e.preventDefault();
				this.form.validateFields(async (err, values) => {
					if ( !err ) {
						try {
							values.password = md5.hex_md5_32(values.password);
							const res = await Login(values);
							localStorage.setItem('token', JSON.stringify(res));
							this.$message.success('登录成功');
							const res2 = await getUserInfo();
							localStorage.setItem('role', res2.role);
							localStorage.setItem('username', res2.nick_name);
							localStorage.setItem('rolename', res2.username);
							// localStorage.setItem('nick_name', res2.nick_name);
							this.$router.push('/');
						} catch (error) {
							this.$message.error(error.message);
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