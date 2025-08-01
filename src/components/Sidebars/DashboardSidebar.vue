<template>

	<!-- 主侧边栏 -->
	<a-layout-sider collapsible class="sider-primary" breakpoint="lg" collapsed-width="0" width="250px"
		:collapsed="sidebarCollapsed" @collapse="$emit('toggleSidebar', !sidebarCollapsed)" :trigger="null"
		:class="['ant-layout-sider-' + sidebarColor, 'ant-layout-sider-' + sidebarTheme]" theme="light"
		:style="{ backgroundColor: 'transparent', }">
		<div class="brand"> <span>芯辰微电子</span></div>
		<hr>

		<!-- 侧边栏导航菜单 -->
		<a-menu theme="light" mode="inline">
			<a-menu-item>
				<router-link to="/categories">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M3 4C3 3.44772 3.44772 3 4 3H16C16.5523 3 17 3.44772 17 4V6C17 6.55228 16.5523 7 16 7H4C3.44772 7 3 6.55228 3 6V4Z" fill="#111827"/>
							<path d="M3 10C3 9.44771 3.44772 9 4 9H10C10.5523 9 11 9.44771 11 10V16C11 16.5523 10.5523 17 10 17H4C3.44772 17 3 16.5523 3 16V10Z" fill="#111827"/>
							<path d="M14 9C13.4477 9 13 9.44771 13 10V16C13 16.5523 13.4477 17 14 17H16C16.5523 17 17 16.5523 17 16V10C17 9.44771 16.5523 9 16 9H14Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">产品分类</span>
				</router-link>
			</a-menu-item>
			<a-menu-item>
				<router-link to="/catalogs">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M9 2C8.44772 2 8 2.44772 8 3C8 3.55228 8.44772 4 9 4H11C11.5523 4 12 3.55228 12 3C12 2.44772 11.5523 2 11 2H9Z" fill="#111827"/>
							<path fill-rule="evenodd" clip-rule="evenodd" d="M4 5C4 3.89543 4.89543 3 6 3C6 4.65685 7.34315 6 9 6H11C12.6569 6 14 4.65685 14 3C15.1046 3 16 3.89543 16 5V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V5ZM7 9C6.44772 9 6 9.44772 6 10C6 10.5523 6.44772 11 7 11H7.01C7.56228 11 8.01 10.5523 8.01 10C8.01 9.44772 7.56228 9 7.01 9H7ZM10 9C9.44772 9 9 9.44772 9 10C9 10.5523 9.44772 11 10 11H13C13.5523 11 14 10.5523 14 10C14 9.44772 13.5523 9 13 9H10ZM7 13C6.44772 13 6 13.4477 6 14C6 14.5523 6.44772 15 7 15H7.01C7.56228 15 8.01 14.5523 8.01 14C8.01 13.4477 7.56228 13 7.01 13H7ZM10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15H13C13.5523 15 14 14.5523 14 14C14 13.4477 13.5523 13 13 13H10Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">产品目录</span>
				</router-link>
			</a-menu-item>
			<a-menu-item>
				<router-link to="/products">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M6 2C5.44772 2 5 2.44772 5 3V4H4C2.89543 4 2 4.89543 2 6V16C2 17.1046 2.89543 18 4 18H16C17.1046 18 18 17.1046 18 16V6C18 4.89543 17.1046 4 16 4H15V3C15 2.44772 14.5523 2 14 2C13.4477 2 13 2.44772 13 3V4H7V3C7 2.44772 6.55228 2 6 2ZM6 7C5.44772 7 5 7.44772 5 8C5 8.55228 5.44772 9 6 9H14C14.5523 9 15 8.55228 15 8C15 7.44772 14.5523 7 14 7H6Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">产品详情</span>
				</router-link>
			</a-menu-item>
			<a-menu-item>
				<router-link to="/company">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 4C4 2.89543 4.89543 2 6 2H14C15.1046 2 16 2.89543 16 4V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" fill="#111827"/>
							<path d="M8 6H12M8 10H12M8 14H10" stroke="white" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="label">公司信息</span>
				</router-link>
			</a-menu-item>
			<a-menu-item>
				<router-link to="/carousels">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C2.89543 3 2 3.89543 2 5V15C2 16.1046 2.89543 17 4 17H16C17.1046 17 18 16.1046 18 15V5C18 3.89543 17.1046 3 16 3H4ZM16 15H4L8 9L10 12L13 8L16 15Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">轮播图管理</span>
				</router-link>
			</a-menu-item>
			<a-menu-item>
				<router-link to="/manuals">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M4 4C4 2.89543 4.89543 2 6 2H14C15.1046 2 16 2.89543 16 4V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4ZM6 4H14V16H6V4Z" fill="#111827"/>
							<path d="M7 8H13M7 12H11" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</span>
					<span class="label">手册管理</span>
				</router-link>
			</a-menu-item>
			<a-menu-item>
				<router-link to="/logs" v-if="isMainUser">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M5 4C3.89543 4 3 4.89543 3 6V14C3 15.1046 3.89543 16 5 16H15C16.1046 16 17 15.1046 17 14V6C17 4.89543 16.1046 4 15 4H5ZM7 8C6.44772 8 6 8.44772 6 9C6 9.55228 6.44772 10 7 10H13C13.5523 10 14 9.55228 14 9C14 8.44772 13.5523 8 13 8H7ZM7 12C6.44772 12 6 12.4477 6 13C6 13.5523 6.44772 14 7 14H11C11.5523 14 12 13.5523 12 13C12 12.4477 11.5523 12 11 12H7Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">日志管理</span>
				</router-link>
			</a-menu-item>
			<a-menu-item>
				<router-link to="/users" v-if="isMainUser">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6.5 10C5.67 10 5 10.67 5 11.5v1a3 3 0 003 3h4a3 3 0 003-3v-1c0-.83-.67-1.5-1.5-1.5h-7z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">账户管理</span>
				</router-link>
			</a-menu-item>
		</a-menu>
		<!-- / 侧边栏导航菜单 -->
	</a-layout-sider>
	<!-- / 主侧边栏 -->

</template>

<script>

export default ({
	props: {
		// 侧边栏折叠状态。
		sidebarCollapsed: {
			type: Boolean,
			default: false,
		},

		// 主侧边栏颜色。
		sidebarColor: {
			type: String,
			default: "primary",
		},

		// 主侧边栏主题：light, white, dark。
		sidebarTheme: {
			type: String,
			default: "light",
		},

		// 是否为主账号。
		isMainUser: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			// sidebarCollapsedModel: this.sidebarCollapsed,
		}
	},
})

</script>
