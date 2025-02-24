import Vue from 'vue'
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';
import App from './App.vue'
import DefaultLayout from './layouts/Default.vue'
import DashboardLayout from './layouts/Dashboard.vue'
import fetchWrapper from '@/plugins/fetchWrapper'; // 确保路径正确
import HasButtonPermission from './plugins/role'; // 导入指令
import router from './router'
// import './plugins/click-away'

import './scss/app.scss';

Vue.use(Antd);

Vue.config.productionTip = false
fetchWrapper.init(Vue.prototype.$message, router);
// Adding template layouts to the vue components.
Vue.component("layout-default", DefaultLayout);
Vue.component("layout-dashboard", DashboardLayout);
Vue.directive('hasButtonPermission', HasButtonPermission);

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')