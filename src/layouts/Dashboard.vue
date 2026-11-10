<!-- 
	This is the dashboard layout, used in dashboard, tables, billing and profile pages.
 -->

<template>
	<div>

		<!-- Dashboard Layout -->
		<a-layout class="layout-dashboard" id="layout-dashboard"
			:class="[navbarFixed ? 'navbar-fixed' : '', !sidebarCollapsed ? 'has-sidebar' : '', sidebarMini ? 'sidebar-mini' : '', layoutClass]">

			<!-- Main Sidebar -->
			<DashboardSidebar :sidebarCollapsed="sidebarCollapsed" :sidebarColor="sidebarColor"
				:sidebarTheme="sidebarTheme" :isMainUser="isMainUser" :perms="perms" :mini="sidebarMini" @toggleSidebar="toggleSidebar" @toggleMini="toggleMini"></DashboardSidebar>
			<!-- / Main Sidebar -->

			<!-- Layout Content -->
			<a-layout>

				<!-- Layout Header's Conditionally Fixed Wrapper -->
				<DashboardHeader :sidebarCollapsed="sidebarCollapsed" :navbarFixed="navbarFixed"
					@toggleSidebar="toggleSidebar"></DashboardHeader>
				<!-- / Layout Header's Conditionally Fixed Wrapper -->

				<!-- Page Content -->
				<a-layout-content>
					<router-view />
				</a-layout-content>
				<!-- / Page Content -->

				<!-- Layout Footer -->
				<DashboardFooter></DashboardFooter>
				<!-- / Layout Footer -->



				<!-- Sidebar Overlay -->
				<div class="sidebar-overlay" @click="sidebarCollapsed = true" v-show="!sidebarCollapsed"></div>
				<!-- / Sidebar Overlay -->

			</a-layout>
			<!-- / Layout Content -->

		</a-layout>
		<!-- / Dashboard Layout -->

	</div>
</template>

<script>

import { isMainUser, getPermissions, can, updateUserInfo } from '@/utils/auth';
import { getMe } from '@/api';
import DashboardSidebar from '../components/Sidebars/DashboardSidebar';
import DashboardHeader from '../components/Headers/DashboardHeader';
import DashboardFooter from '../components/Footers/DashboardFooter';

export default ({
	components: {
		DashboardSidebar,
		DashboardHeader,
		DashboardFooter,
	},
	data() {
		return {
			// Sidebar collapsed status.
			sidebarCollapsed: false,

			// 桌面宽度下菜单是否收起成只剩图标。
			sidebarMini: false,

			// Main sidebar color.
			sidebarColor: "primary",

			// Main sidebar theme : light, white, dark.
			sidebarTheme: "white",

			// Header fixed status.
			navbarFixed: false,

			// Main user status.
			isMainUser: true,

			// 功能权限（菜单据此显示）。主账号 '*'，子账号是功能 key 数组
			perms: [],
		}
	},
	created() {
		// 取不到用户信息时按子账号处理（隐藏主账号菜单），宁可少显示也不能多显示
		this.isMainUser = isMainUser();
		this.perms = getPermissions();
		this.refreshPermissions();
		try { this.sidebarMini = localStorage.getItem('sidebarMini') === '1'; } catch (e) { /* 读不到就默认展开 */ }
	},
	methods: {
		// 向服务端取一次最新的权限：主账号改了角色，子账号刷新页面就能看到变化，不用重新登录。取失败就用登录时存的
		async refreshPermissions() {
			try {
				const me = await getMe();
				updateUserInfo({ userType: me.userType, roleId: me.roleId, permissions: me.permissions });
				this.isMainUser = isMainUser();
				this.perms = getPermissions();
				// 当前页面的权限被收回了：回首页，路由守卫会把人送到第一个有权限的页面
				const need = this.$route && this.$route.meta && this.$route.meta.permission;
				if (need && !can(need)) this.$router.replace('/categories').catch(() => {});
			} catch (e) {
				// 取不到（断网等）：沿用登录时保存的权限，请求层已经处理了登录过期
			}
		},
		toggleSidebar(value) {
			this.sidebarCollapsed = value;
		},
		// 桌面宽度下菜单「收起成只剩图标 / 展开」，记住这个浏览器上次的选择（只是个人习惯，读写失败就不记）
		toggleMini() {
			this.sidebarMini = !this.sidebarMini;
			try { localStorage.setItem('sidebarMini', this.sidebarMini ? '1' : '0'); } catch (e) { /* 忽略 */ }
		},
	},
	computed: {
		// Sets layout's element's class based on route's meta data.
		layoutClass() {
			return this.$route.meta.layoutClass;
		}
	},
})

</script>
