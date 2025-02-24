<template>

	<!-- 设置抽屉 -->
	<a-drawer
		class="settings-drawer"
		placement="right"
		:closable="false"
		:visible="showSettingsDrawer"
		width="360"
		:getContainer="() => wrapper"
		@close="$emit('toggleSettingsDrawer', false)"
	>

		<!-- 设置抽屉关闭按钮 -->
		<a-button type="link" class="btn-close" @click="$emit('toggleSettingsDrawer', false)">
			<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9">
				<g id="close" transform="translate(0.75 0.75)">
					<path id="Path" d="M7.5,0,0,7.5" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5"/>
					<path id="Path-2" data-name="Path" d="M0,0,7.5,7.5" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5"/>
				</g>
			</svg>
		</a-button>
		<!-- / 设置抽屉关闭按钮 -->
		
		<!-- 设置抽屉内容 -->
		<div class="drawer-content">
			<h6>配置器</h6>
			<p>查看我们的仪表板选项。</p>
			<hr>
			<div class="sidebar-color">
				<h6>侧边栏颜色</h6>
				<a-radio-group v-model="sidebarColorModel" @change="$emit('updateSidebarColor', $event.target.value)" defaultValue="primary">
					<a-radio-button value="primary" class="bg-primary"></a-radio-button>
					<a-radio-button value="secondary" class="bg-secondary"></a-radio-button>
					<a-radio-button value="success" class="bg-success"></a-radio-button>
					<a-radio-button value="danger" class="bg-danger"></a-radio-button>
					<a-radio-button value="warning" class="bg-warning"></a-radio-button>
					<a-radio-button value="black" class="bg-dark"></a-radio-button>
				</a-radio-group>
			</div>
			<div class="sidenav-type">
				<h6>侧边导航类型</h6>
				<p>在两种不同的侧边导航类型之间选择。</p>
				<a-radio-group button-style="solid" v-model="sidebarThemeModel" @change="$emit('updateSidebarTheme', $event.target.value)" defaultValue="primary">
					<a-radio-button value="light">透明</a-radio-button>
					<a-radio-button value="white">白色</a-radio-button>
				</a-radio-group>
			</div>
			<div class="navbar-fixed">
				<h6>固定导航栏</h6>
				<a-switch default-checked v-model="navbarFixedModel" @change="$emit('toggleNavbarPosition', navbarFixedModel)" />
			</div>
		</div>
		<!-- / 设置抽屉内容 -->

	</a-drawer>
	<!-- / 设置抽屉 -->

</template>

<script>
	import 'vue-github-buttons/dist/vue-github-buttons.css'; // Stylesheet
	import VueGitHubButtons from 'vue-github-buttons';
	import Vue from 'vue';
	Vue.use(VueGitHubButtons, { useCache: true });

	export default ({
		props: {
			// Settings drawer visiblility status.
			showSettingsDrawer: {
				type: Boolean,
				default: false,
			},
			
			// Main sidebar color.
			sidebarColor: {
				type: String,
				default: "primary",
			},
			
			// Main sidebar theme : light, white, dark.
			sidebarTheme: {
				type: String,
				default: "white",
			},

			// Header fixed status.
			navbarFixed: {
				type: Boolean,
				default: false,
			},

		},
		data() {
			return {
				// The wrapper element to attach dropdowns to.
				wrapper: document.body,
				
				// Main sidebar color.
				sidebarColorModel: this.sidebarColor,
				
				// Main sidebar theme : light, white, dark.
				sidebarThemeModel: this.sidebarTheme,

				// Header fixed status.
				navbarFixedModel: this.navbarFixed,
			}
		},
		mounted: function(){
			// Set the wrapper to the proper element, layout wrapper.
			this.wrapper = document.getElementById('layout-dashboard') ;
		},
	})

</script>
