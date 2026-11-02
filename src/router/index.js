import Vue from 'vue'
import VueRouter from 'vue-router'
import { isLoggedIn, isMainUser, clearAuth } from '@/utils/auth'

Vue.use(VueRouter)

let routes = [
	{
		// will match everything
		path: '*',
		component: () => import('../views/404.vue'),
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
			requiresAuth: true
		},
		component: () => import('@/views/Categories.vue'),
	},
	{
		path: '/catalogs',
		name: 'Catalogs',
		layout: "dashboard",
		meta:{
			name:'产品目录',
			requiresAuth: true
		},
		component: () => import('@/views/Catalogs.vue'),
	},
	{
		path: '/products',
		name: 'Products',
		layout: "dashboard",
		meta:{
			name:'产品详情',
			requiresAuth: true
		},
		component: () => import('@/views/Products.vue'),
	},
	{
		path: '/products/bulk-en',
		name: 'ProductsBulkEn',
		layout: "dashboard",
		meta:{
			name:'批量关联英文PDF',
			requiresAuth: true
		},
		component: () => import('@/views/ProductsBulkEn.vue'),
	},
	{
		path: '/orphan-files',
		name: 'OrphanFiles',
		layout: "dashboard",
		meta:{
			name:'孤儿文件清理',
			requiresAuth: true,
			requiresMainUser: true
		},
		component: () => import('@/views/OrphanFiles.vue'),
	},
	{
		path: '/company',
		name: 'CompanyInfo',
		layout: "dashboard",
		meta:{
			name:'公司信息',
			requiresAuth: true
		},
		component: () => import('@/views/CompanyInfo.vue'),
	},
	{
		path: '/carousels',
		name: 'Carousels',
		layout: "dashboard",
		meta:{
			name:'轮播图管理',
			requiresAuth: true
		},
		component: () => import('@/views/Carousels.vue'),
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
		path: '/manuals',
		name: 'Manuals',
		layout: "dashboard",
		meta:{
			name:'手册管理',
			requiresAuth: true
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
			} else {
				next();
			}
		} else {
			// 令牌已过期的话顺手清掉残留的登录信息
			clearAuth();
			next('/login');
		}
	} else {
		if (isLogin && to.path === '/login') {
			next('/categories');
		} else {
			next();
		}
	}
})

export default router
