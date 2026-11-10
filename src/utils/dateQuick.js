import moment from 'moment'

// 日期段快捷按钮（给 components/DateRangeQuick.vue 用）。range() 每次点的时候才算，避免页面开着过了零点还是旧日期
const today = () => moment().startOf('day')

export const RECENT_QUICKS = [
	{ key: 'today', text: '今天', range: () => [today(), today()] },
	{ key: 'yesterday', text: '昨天', range: () => [today().subtract(1, 'day'), today().subtract(1, 'day')] },
	{ key: '7d', text: '近 7 天', range: () => [today().subtract(6, 'day'), today()] },
	{ key: '30d', text: '近 30 天', range: () => [today().subtract(29, 'day'), today()] },
	{ key: 'month', text: '本月', range: () => [today().startOf('month'), today()] }
]
