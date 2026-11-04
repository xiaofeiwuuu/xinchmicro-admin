// 列表分页的统一配置：每页 20 / 50 / 100 条，默认 20。服务端分页的列表页都用它，不要各写各的。
export const PAGE_SIZE_OPTIONS = ['20', '50', '100']

export function newPagination(extra = {}) {
	return {
		current: 1,
		pageSize: 20,
		total: 0,
		showSizeChanger: true,
		pageSizeOptions: PAGE_SIZE_OPTIONS,
		showTotal: (t) => `共 ${t} 条`,
		...extra
	}
}

// 表格翻页/改每页条数时的统一处理：改了每页条数就回到第 1 页。p 是 a-table 的 change 事件给的分页对象
export function applyTableChange(pagination, p) {
	pagination.current = p.pageSize !== pagination.pageSize ? 1 : p.current
	pagination.pageSize = p.pageSize
}
