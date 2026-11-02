// 请求失败时，fetchWrapper 已经统一弹出过错误提示，并给错误打上 notified 标记。
// 页面的 catch 里再提示之前先用这个函数检查，避免用户同时看到两条提示；
// 不是请求层抛出的错误（表单校验、直传云存储失败等）没有这个标记，会正常提示。
//
//   notifyError(this, error, '删除失败')            →  "删除失败: 具体原因"（没有具体原因就只有"删除失败"）
//   notifyError(this, error, '', '获取数据失败')     →  有具体原因就显示原因，否则显示"获取数据失败"
export function notifyError(vm, error, prefix = '', fallback = '操作失败') {
  if (error && error.notified) return;
  const detail = (error && error.message) || '';
  const text = detail ? (prefix ? `${prefix}: ${detail}` : detail) : (prefix || fallback);
  vm.$message.error(text);
}
