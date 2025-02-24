<template>

	<!-- 布局头部 (导航栏) -->
	<a-layout-header>
		<div class="header-col header-brand">
			<h6>后台管理</h6>
		</div>
	</a-layout-header>
	<!-- / 布局头部 (导航栏) -->

</template>

<script>

	export default ({
		data() {
			return {
				// Collapse navigation value.
				// Binded model property for "Collapsible Navigation Menu" collapsed status .
				collapseNav: 0,
			}
		},
	})

</script>

<style lang="scss" scoped>

	.nav-link svg {
		margin-right: 5px;
		vertical-align: middle;
	}
	.nav-link span {
		vertical-align: middle;
	}
	.ant-menu-submenu-popup {
		width: 100%;
	}

</style>