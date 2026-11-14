import Vue from 'vue'
import VueRouter from 'vue-router'
import { isLoggedIn, isMainUser, clearAuth, can } from '@/utils/auth'

Vue.use(VueRouter)

let routes = [
	{
		// 未知地址（删掉的页面、旧收藏夹、手输错误）一律回首页；首页再按登录状态跳到分类页或登录页。
		// 原来指向的 404.vue 没有 <template> 根节点，渲染出来是空白页
		path: '*',
		redirect: '/',
	},
	{
		path: '/',
		name: 'Home',
		redirect: '/categories',
		meta: {
			requiresAuth: true
		}
	},{
		path: '/login',
		name: 'Login',
		component: () => import('../views/Sign-In.vue'),
		meta: {
			requiresAuth: false
		}
	},
	{
		path: '/categories',
		name: 'Categories',
		layout: "dashboard",
		meta:{
			name:'产品分类',
			requiresAuth: true,
			permission: 'category.view'
		},
		component: () => import('@/views/Categories.vue'),
	},
	{
		path: '/catalogs',
		name: 'Catalogs',
		layout: "dashboard",
		meta:{
			name:'产品目录',
			requiresAuth: true,
			permission: 'catalog.view'
		},
		component: () => import('@/views/Catalogs.vue'),
	},
	{
		path: '/products',
		name: 'Products',
		layout: "dashboard",
		meta:{
			name:'产品详情',
			requiresAuth: true,
			permission: 'product.view'
		},
		component: () => import('@/views/Products.vue'),
	},
	{
		path: '/products/bulk-en',
		name: 'ProductsBulkEn',
		layout: "dashboard",
		meta:{
			name:'批量关联英文PDF',
			requiresAuth: true,
			permission: 'product.edit'
		},
		component: () => import('@/views/ProductsBulkEn.vue'),
	},
	{
		path: '/files',
		name: 'FileManager',
		layout: "dashboard",
		meta:{
			name:'文件管理',
			requiresAuth: true,
			requiresMainUser: true
		},
		component: () => import('@/views/FileManager.vue'),
	},
	{
		path: '/company',
		name: 'CompanyInfo',
		layout: "dashboard",
		meta:{
			name:'公司信息',
			requiresAuth: true,
			permission: 'company.view'
		},
		component: () => import('@/views/CompanyInfo.vue'),
	},
	{
		path: '/carousels',
		name: 'Carousels',
		layout: "dashboard",
		meta:{
			name:'轮播图管理',
			requiresAuth: true,
			permission: 'carousel.view'
		},
		component: () => import('@/views/Carousels.vue'),
	},
	{
		path: '/announcements',
		name: 'Announcements',
		layout: "dashboard",
		meta:{
			name:'公告管理',
			requiresAuth: true,
			permission: 'announcement.view'
		},
		component: () => import('@/views/Announcements.vue'),
	},
	{
		path: '/legal',
		name: 'LegalDocs',
		layout: "dashboard",
		meta:{
			name:'协议与规则',
			requiresAuth: true,
			permission: 'legal.view',
			allowCopy: true // 富文本编辑器里要能选中文字
		},
		component: () => import('@/views/LegalDocs.vue'),
	},
	{
		path: '/logs',
		name: 'Logs',
		layout: "dashboard",
		meta:{
			name:'日志管理',
			requiresAuth: true,
			requiresMainUser: true
		},
		component: () => import('@/views/Logs.vue'),
	},
	{
		path: '/roles',
		name: 'Roles',
		layout: "dashboard",
		meta:{
			name:'角色管理',
			requiresAuth: true,
			requiresMainUser: true
		},
		component: () => import('@/views/Roles.vue'),
	},
	{
		path: '/env',
		name: 'EnvConfig',
		layout: "dashboard",
		meta:{
			name:'配置助手',
			requiresAuth: true,
			allowCopy: true, // 变量名要能选中复制（页面上不会出现机密的值）
			requiresMainUser: true
		},
		component: () => import('@/views/EnvConfig.vue'),
	},
	{
		path: '/video-courses',
		name: 'VideoCourses',
		layout: "dashboard",
		meta:{
			name:'课程管理',
			requiresAuth: true,
			permission: 'video.view'
		},
		component: () => import('@/views/VideoCourses.vue'),
	},
	{
		path: '/video-chapters',
		name: 'VideoChapters',
		layout: "dashboard",
		meta:{
			name:'章节管理',
			requiresAuth: true,
			permission: 'video.view'
		},
		component: () => import('@/views/VideoChapters.vue'),
	},
	{
		path: '/video-orders',
		name: 'VideoOrders',
		layout: "dashboard",
		meta:{
			name:'视频订单',
			requiresAuth: true,
			allowCopy: true,
			permission: 'video.orders'
		},
		component: () => import('@/views/VideoOrders.vue'),
	},
	{
		path: '/videos',
		name: 'VideoList',
		layout: "dashboard",
		meta:{
			name:'视频管理',
			requiresAuth: true,
			permission: 'video.view'
		},
		component: () => import('@/views/VideoList.vue'),
	},
	{
		path: '/vod-test',
		name: 'VodTest',
		layout: "dashboard",
		meta:{
			name:'视频上传测试',
			requiresAuth: true,
			allowCopy: true,
			requiresMainUser: true
		},
		component: () => import('@/views/VodTest.vue'),
	},
	{
		path: '/no-permission',
		name: 'NoPermission',
		layout: "dashboard",
		meta:{
			name:'没有权限',
			requiresAuth: true
		},
		component: () => import('@/views/NoPermission.vue'),
	},
	{
		path: '/users',
		name: 'UserManagement',
		layout: "dashboard",
		meta:{
			name:'账户管理',
			requiresAuth: true,
			requiresMainUser: true
		},
		component: () => import('@/views/UserManagement.vue'),
	},
	{
		path: '/shop/customers',
		name: 'ShopCustomers',
		layout: "dashboard",
		meta:{
			name:'客户管理',
			requiresAuth: true,
			permission: 'customer.view'
		},
		component: () => import('@/views/ShopCustomers.vue'),
	},
	{
		path: '/shop/product-sales',
		name: 'ShopProductSales',
		layout: "dashboard",
		meta:{
			name:'产品销量',
			requiresAuth: true,
			permission: 'stats.view'
		},
		component: () => import('@/views/ShopProductSales.vue'),
	},
	{
		path: '/shop/stats',
		name: 'ShopStats',
		layout: "dashboard",
		meta:{
			name:'数据统计',
			requiresAuth: true,
			permission: 'stats.view'
		},
		component: () => import('@/views/ShopStats.vue'),
	},
	{
		path: '/shop/bills',
		name: 'ShopBills',
		layout: "dashboard",
		meta:{
			name:'对账与账单',
			requiresAuth: true,
			allowCopy: true, // 订单号、单号要能选中复制
			permission: 'bills.view'
		},
		component: () => import('@/views/ShopBills.vue'),
	},
	{
		path: '/shop/orders',
		name: 'ShopOrders',
		layout: "dashboard",
		meta:{
			name:'订单管理',
			requiresAuth: true,
			permission: 'order.view'
		},
		component: () => import('@/views/ShopOrders.vue'),
	},
	{
		path: '/shop/products',
		name: 'ShopProducts',
		layout: "dashboard",
		meta:{
			name:'价格库存',
			requiresAuth: true,
			permission: 'price.view'
		},
		component: () => import('@/views/ShopProducts.vue'),
	},
	{
		path: '/manuals',
		name: 'Manuals',
		layout: "dashboard",
		meta:{
			name:'手册管理',
			requiresAuth: true,
			permission: 'manual.view'
		},
		component: () => import('@/views/Manuals.vue'),
	},
]

// Adding layout property from each route to the meta
// object so it can be accessed later.
function addLayoutToRoute( route, parentLayout = "default" )
{
	route.meta = route.meta || {} ;
	route.meta.layout = route.layout || parentLayout ;
	
	if( route.children )
	{
		route.children = route.children.map( ( childRoute ) => addLayoutToRoute( childRoute, route.meta.layout ) ) ;
	}
	return route ;
}

routes = routes.map( ( route ) => addLayoutToRoute( route ) ) ;

const router = new VueRouter({
	mode: 'hash',
	base: './',
	routes,
	scrollBehavior (to, from, savedPosition) {
		if ( to.hash ) {
			return {
				selector: to.hash,
				behavior: 'smooth',
			}
		}
		return {
			x: 0,
			y: 0,
			behavior: 'smooth',
		}
	}
})

// 添加全局路由守卫
// 有权限的第一个页面（菜单顺序）。子账号没有权限的页面会被送到这里
const PAGE_ORDER = [
	['/categories', 'category.view'], ['/catalogs', 'catalog.view'], ['/products', 'product.view'], ['/manuals', 'manual.view'],
	['/shop/orders', 'order.view'], ['/shop/customers', 'customer.view'], ['/shop/products', 'price.view'],
	['/shop/stats', 'stats.view'], ['/shop/product-sales', 'stats.view'], ['/shop/bills', 'bills.view'], ['/video-courses', 'video.view'], ['/video-orders', 'video.orders'],
	['/company', 'company.view'], ['/carousels', 'carousel.view'], ['/announcements', 'announcement.view'], ['/legal', 'legal.view']
];
function firstAllowedPath() {
	const hit = PAGE_ORDER.find(([, perm]) => can(perm));
	return hit ? hit[0] : '/no-permission';
}

router.beforeEach((to, from, next) => {
	// 令牌存在且没有过期才算已登录
	const isLogin = isLoggedIn()
	
	if (to.meta.requiresAuth) {
		if (isLogin) {
			// 检查是否需要主账号权限
			if (to.meta.requiresMainUser) {
				if (isMainUser()) {
					next();
				} else {
					// 如果不是主账号，重定向到首页
					next('/categories');
				}
			} else if (to.meta.permission && !can(to.meta.permission)) {
				// 没有这个页面对应的功能权限：去第一个有权限的页面；一个都没有就去提示页
				next(firstAllowedPath());
			} else {
				next();
			}
		} else {
			// 令牌已过期的话顺手清掉残留的登录信息
			clearAuth();
			// 记住要去的页面（比如企业微信通知里的订单链接），登录后跳回去；首页本来就是默认落点，不用记
			next(to.fullPath && to.fullPath !== '/' ? { path: '/login', query: { redirect: to.fullPath } } : '/login');
		}
	} else {
		if (isLogin && to.path === '/login') {
			next('/categories');
		} else {
			next();
		}
	}
})

// 页面默认不能选中文字；路由 meta 里有 allowCopy: true 的页面才允许（见 scss/base/_typography.scss）
router.afterEach((to) => {
	document.body.classList.toggle('copy-ok', !!(to.meta && to.meta.allowCopy))
})

export default router
