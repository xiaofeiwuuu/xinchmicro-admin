<!-- 
	This is the dashboard layout, used in dashboard, tables, billing and profile pages.
 -->

<template>
	<div>

		<!-- Dashboard Layout -->
		<a-layout class="layout-dashboard" id="layout-dashboard"
			:class="[navbarFixed ? 'navbar-fixed' : '', !sidebarCollapsed ? 'has-sidebar' : '', layoutClass]">

			<!-- Main Sidebar -->
			<DashboardSidebar :sidebarCollapsed="sidebarCollapsed" :sidebarColor="sidebarColor"
				:sidebarTheme="sidebarTheme" :isMainUser="isMainUser" @toggleSidebar="toggleSidebar"></DashboardSidebar>
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

import { isMainUser } from '@/utils/auth';
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

			// Main sidebar color.
			sidebarColor: "primary",

			// Main sidebar theme : light, white, dark.
			sidebarTheme: "white",

			// Header fixed status.
			navbarFixed: false,

			// Main user status.
			isMainUser: true,
		}
	},
	created() {
		// 取不到用户信息时按子账号处理（隐藏主账号菜单），宁可少显示也不能多显示
		this.isMainUser = isMainUser();
	},
	methods: {
		toggleSidebar(value) {
			this.sidebarCollapsed = value;
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
