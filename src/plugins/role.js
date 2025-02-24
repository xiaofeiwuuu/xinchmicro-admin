/**
 * v-hasButtonPermission 按钮权限处理
 * Copyright (c) 2019 ruoyi
 */

export default {
  inserted(el, binding, vnode) {
    const role = JSON.parse(localStorage.getItem('role')) || 3; // 从 localStorage 获取角色数组
    const allowedRoles = binding.value; // 获取传入的值（数组）

    // 检查传入的值是否为数组
    if (Array.isArray(allowedRoles)) {
      const hasPermission = allowedRoles.includes(role); // 检查当前角色是否在允许的角色数组中

      if (!hasPermission) {
        el.parentNode && el.parentNode.removeChild(el); // 如果没有权限，移除元素
      }
    } else {
      el.parentNode && el.parentNode.removeChild(el); // 如果不是数组，移除元素
    }
  }
}
