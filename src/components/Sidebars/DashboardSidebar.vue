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
			<a-menu-item class="menu-item-header" disabled v-if="can('category.view') || can('catalog.view') || can('product.view') || can('manual.view')">产品</a-menu-item>
			<a-menu-item v-if="can('category.view')">
				<a-tooltip placement="right" :title="mini ? '产品分类' : ''">
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
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('catalog.view')">
				<a-tooltip placement="right" :title="mini ? '产品目录' : ''">
					<router-link to="/catalogs">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M9 2C8.44772 2 8 2.44772 8 3C8 3.55228 8.44772 4 9 4H11C11.5523 4 12 3.55228 12 3C12 2.44772 11.5523 2 11 2H9Z" fill="#111827"/>
							<path fill-rule="evenodd" clip-rule="evenodd" d="M4 5C4 3.89543 4.89543 3 6 3C6 4.65685 7.34315 6 9 6H11C12.6569 6 14 4.65685 14 3C15.1046 3 16 3.89543 16 5V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V5ZM7 9C6.44772 9 6 9.44772 6 10C6 10.5523 6.44772 11 7 11H7.01C7.56228 11 8.01 10.5523 8.01 10C8.01 9.44772 7.56228 9 7.01 9H7ZM10 9C9.44772 9 9 9.44772 9 10C9 10.5523 9.44772 11 10 11H13C13.5523 11 14 10.5523 14 10C14 9.44772 13.5523 9 13 9H10ZM7 13C6.44772 13 6 13.4477 6 14C6 14.5523 6.44772 15 7 15H7.01C7.56228 15 8.01 14.5523 8.01 14C8.01 13.4477 7.56228 13 7.01 13H7ZM10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15H13C13.5523 15 14 14.5523 14 14C14 13.4477 13.5523 13 13 13H10Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">产品目录</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('product.view')">
				<a-tooltip placement="right" :title="mini ? '产品详情' : ''">
					<router-link to="/products">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M6 2C5.44772 2 5 2.44772 5 3V4H4C2.89543 4 2 4.89543 2 6V16C2 17.1046 2.89543 18 4 18H16C17.1046 18 18 17.1046 18 16V6C18 4.89543 17.1046 4 16 4H15V3C15 2.44772 14.5523 2 14 2C13.4477 2 13 2.44772 13 3V4H7V3C7 2.44772 6.55228 2 6 2ZM6 7C5.44772 7 5 7.44772 5 8C5 8.55228 5.44772 9 6 9H14C14.5523 9 15 8.55228 15 8C15 7.44772 14.5523 7 14 7H6Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">产品详情</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('manual.view')">
				<a-tooltip placement="right" :title="mini ? '手册管理' : ''">
					<router-link to="/manuals">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M4 4C4 2.89543 4.89543 2 6 2H14C15.1046 2 16 2.89543 16 4V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4ZM6 4H14V16H6V4Z" fill="#111827"/>
							<path d="M7 8H13M7 12H11" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</span>
					<span class="label">手册管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item class="menu-item-header" disabled v-if="can('customer.view') || can('stats.view') || can('bills.view') || can('order.view') || can('price.view')">商城</a-menu-item>
			<a-menu-item v-if="can('customer.view')">
				<a-tooltip placement="right" :title="mini ? '客户管理' : ''">
					<router-link to="/shop/customers">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6.5 10C5.67 10 5 10.67 5 11.5v1a3 3 0 003 3h4a3 3 0 003-3v-1c0-.83-.67-1.5-1.5-1.5h-7z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">客户管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('stats.view')">
				<a-tooltip placement="right" :title="mini ? '数据统计' : ''">
					<router-link to="/shop/stats">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">数据统计</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('stats.view')">
				<a-tooltip placement="right" :title="mini ? '产品销量' : ''">
					<router-link to="/shop/product-sales">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M3 17V8M8 17V4M13 17V10M18 17H2" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</span>
					<span class="label">产品销量</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('bills.view')">
				<a-tooltip placement="right" :title="mini ? '对账与账单' : ''">
					<router-link to="/shop/bills">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6.414A2 2 0 0015.414 5L13 2.586A2 2 0 0011.586 2H6zm2 8a1 1 0 100 2h4a1 1 0 100-2H8zm0 4a1 1 0 100 2h2a1 1 0 100-2H8z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">对账与账单</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('order.view')">
				<a-tooltip placement="right" :title="mini ? '订单管理' : ''">
					<router-link to="/shop/orders">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M5 4C3.89543 4 3 4.89543 3 6V14C3 15.1046 3.89543 16 5 16H15C16.1046 16 17 15.1046 17 14V6C17 4.89543 16.1046 4 15 4H5ZM7 8C6.44772 8 6 8.44772 6 9C6 9.55228 6.44772 10 7 10H13C13.5523 10 14 9.55228 14 9C14 8.44772 13.5523 8 13 8H7ZM7 12C6.44772 12 6 12.4477 6 13C6 13.5523 6.44772 14 7 14H11C11.5523 14 12 13.5523 12 13C12 12.4477 11.5523 12 11 12H7Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">订单管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('price.view')">
				<a-tooltip placement="right" :title="mini ? '价格库存' : ''">
					<router-link to="/shop/products">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4.5v.6c1.2.2 2 .95 2 2h-1.5c0-.45-.4-.8-1.25-.8s-1.25.3-1.25.75c0 .5.5.7 1.6 1 1.5.4 2.65.95 2.65 2.3 0 1.05-.8 1.8-2 2v.65h-1.5v-.65c-1.3-.2-2.1-1-2.15-2.1h1.5c.05.5.5.85 1.4.85.85 0 1.25-.35 1.25-.8 0-.5-.45-.75-1.55-1.05-1.5-.4-2.7-.95-2.7-2.3 0-1 .75-1.75 2-1.95v-.55h1.5z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">价格库存</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item class="menu-item-header" disabled v-if="can('company.view') || can('carousel.view') || can('announcement.view') || can('legal.view')">公司</a-menu-item>
			<a-menu-item v-if="can('company.view')">
				<a-tooltip placement="right" :title="mini ? '公司信息' : ''">
					<router-link to="/company">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 4C4 2.89543 4.89543 2 6 2H14C15.1046 2 16 2.89543 16 4V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" fill="#111827"/>
							<path d="M8 6H12M8 10H12M8 14H10" stroke="white" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="label">公司信息</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('carousel.view')">
				<a-tooltip placement="right" :title="mini ? '轮播图管理' : ''">
					<router-link to="/carousels">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C2.89543 3 2 3.89543 2 5V15C2 16.1046 2.89543 17 4 17H16C17.1046 17 18 16.1046 18 15V5C18 3.89543 17.1046 3 16 3H4ZM16 15H4L8 9L10 12L13 8L16 15Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">轮播图管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('announcement.view')">
				<a-tooltip placement="right" :title="mini ? '公告管理' : ''">
					<router-link to="/announcements">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M3 8C3 7.44772 3.44772 7 4 7H6L12 3.5V16.5L6 13H4C3.44772 13 3 12.5523 3 12V8Z" fill="#111827"/>
							<path d="M15 7.5C15.8 8.2 16.3 9.05 16.3 10C16.3 10.95 15.8 11.8 15 12.5" stroke="#111827" stroke-width="1.6" stroke-linecap="round"/>
							<path d="M5.5 13.5L6.3 17H8.3L7.6 14" fill="#111827"/>
						</svg>
					</span>
					<span class="label">公告管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="can('legal.view')">
				<a-tooltip placement="right" :title="mini ? '协议与规则' : ''">
					<router-link to="/legal">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M5 2.5H12L16 6.5V16.5C16 17.05 15.55 17.5 15 17.5H5C4.45 17.5 4 17.05 4 16.5V3.5C4 2.95 4.45 2.5 5 2.5Z" fill="#111827"/>
							<path d="M7 9.5H13M7 12H13M7 14.5H10.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="label">协议与规则</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item class="menu-item-header" disabled v-if="isMainUser">系统</a-menu-item>
			<a-menu-item v-if="isMainUser">
				<a-tooltip placement="right" :title="mini ? '日志管理' : ''">
					<router-link to="/logs">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M5 4C3.89543 4 3 4.89543 3 6V14C3 15.1046 3.89543 16 5 16H15C16.1046 16 17 15.1046 17 14V6C17 4.89543 16.1046 4 15 4H5ZM7 8C6.44772 8 6 8.44772 6 9C6 9.55228 6.44772 10 7 10H13C13.5523 10 14 9.55228 14 9C14 8.44772 13.5523 8 13 8H7ZM7 12C6.44772 12 6 12.4477 6 13C6 13.5523 6.44772 14 7 14H11C11.5523 14 12 13.5523 12 13C12 12.4477 11.5523 12 11 12H7Z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">日志管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="isMainUser">
				<a-tooltip placement="right" :title="mini ? '文件管理' : ''">
					<router-link to="/files">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 4C4 2.89543 4.89543 2 6 2H11.5858C11.851 2 12.1054 2.10536 12.2929 2.29289L15.7071 5.70711C15.8946 5.89464 16 6.149 16 6.41421V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" fill="#111827"/>
							<path d="M7 10H13M7 13H11" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="label">文件管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="isMainUser">
				<a-tooltip placement="right" :title="mini ? '账户管理' : ''">
					<router-link to="/users">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6.5 10C5.67 10 5 10.67 5 11.5v1a3 3 0 003 3h4a3 3 0 003-3v-1c0-.83-.67-1.5-1.5-1.5h-7z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">账户管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
			<a-menu-item v-if="isMainUser">
				<a-tooltip placement="right" :title="mini ? '角色管理' : ''">
					<router-link to="/roles">
					<span class="icon">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6.5 10C5.67 10 5 10.67 5 11.5v1a3 3 0 003 3h4a3 3 0 003-3v-1c0-.83-.67-1.5-1.5-1.5h-7z" fill="#111827"/>
						</svg>
					</span>
					<span class="label">角色管理</span>
				</router-link>
				</a-tooltip>
			</a-menu-item>
		</a-menu>
		<!-- / 侧边栏导航菜单 -->

		<!-- 收起 / 展开（只在桌面宽度显示，窄屏用头部的按钮） -->
		<a-tooltip placement="right" :title="mini ? '展开菜单' : ''">
			<div class="sider-toggle" @click="$emit('toggleMini')">
				<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z" /></svg>
				<span v-if="!mini" class="sider-toggle-text">收起菜单</span>
			</div>
		</a-tooltip>
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

		// 桌面宽度下是否收起成只剩图标。
		mini: {
			type: Boolean,
			default: false,
		},

		// 是否为主账号。
		isMainUser: {
			type: Boolean,
			default: true,
		},

		// 功能权限：主账号是 '*'，子账号是功能 key 数组（见服务端 utils/permissions.js）。只用来显示菜单，真正的权限在服务端校验
		perms: {
			type: [Array, String],
			default: () => [],
		},
	},
	data() {
		return {
			// sidebarCollapsedModel: this.sidebarCollapsed,
		}
	},
	methods: {
		can(key) {
			return this.isMainUser || this.perms === '*' || (Array.isArray(this.perms) && this.perms.includes(key));
		},
	},
})

</script>
