import Vue from 'vue'
import './plugins/antd'; // Ant Design Vue 按需引入（必须在 fetchWrapper.init 之前，它要取 $message）
import App from './App.vue'
import DefaultLayout from './layouts/Default.vue'
import DashboardLayout from './layouts/Dashboard.vue'
import fetchWrapper from '@/plugins/fetchWrapper'; // 确保路径正确
import router from './router'
import canDirective from '@/directives/can'

import './scss/app.scss';

Vue.config.productionTip = false
fetchWrapper.init(Vue.prototype.$message, router);
Vue.directive('can', canDirective); // 没有功能权限就隐藏按钮，见 directives/can.js
// Adding template layouts to the vue components.
Vue.component("layout-default", DefaultLayout);
Vue.component("layout-dashboard", DashboardLayout);

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')