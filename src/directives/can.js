// v-can：没有对应功能权限的账号看不到这个按钮 / 链接（服务端永远是第二道关，这里只是不让人看到点了也没用的按钮）。
// 用法：<a-button v-can="'order.ship'">发货</a-button>；传数组表示任意一个有就显示。主账号全部显示。
import { can } from '@/utils/auth'

const allowed = (value) => (Array.isArray(value) ? value.some((k) => can(k)) : can(value))
const apply = (el, binding) => {
  if (allowed(binding.value)) el.style.removeProperty('display')
  else el.style.setProperty('display', 'none', 'important')
}

export default {
  inserted: apply,
  componentUpdated: apply
}
