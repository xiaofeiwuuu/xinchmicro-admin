<!-- 
	This is the main page of the application, the layout component is used here,
	and the router-view is passed to it.
	Layout component is dynamically declared based on the layout for each route,
	specified in routes list router/index.js .
 -->

<template>
	<!-- 全局使用 Ant Design 的中文语言包：弹窗的"确定/取消"、分页、空数据提示等都显示中文 -->
	<a-config-provider :locale="locale">
		<div id="app">
			<component :is="layout">
				<router-view />
			</component>
		</div>
	</a-config-provider>
</template>

<script>
	import zhCN from 'ant-design-vue/lib/locale-provider/zh_CN'
	// import checkUpdate from '../version-webpack-plugin'
	export default ({
		data() {
			return {
				locale: zhCN,
				timer: null
			}
		},
		computed: {
			// Sets components name based on current route's specified layout, defaults to
			// <layout-default></layout-default> component.
			layout() {
				return "layout-" + ( this.$route.meta.layout || "default" ).toLowerCase() ;
			}
		},
		// mounted() {
		// 	this.timer = setInterval(() => {
		// 		checkUpdate()
		// 	}, 10000);
		// },
		// destroyed() {
		// 	clearInterval(this.timer)
		// }
	})
	
</script>

<style lang="scss">
::-webkit-scrollbar {
    display: none; /* 隐藏滚动条 */
}
</style>