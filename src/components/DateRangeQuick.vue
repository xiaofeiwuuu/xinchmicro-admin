<!-- 日期段选择：日期选择框在前，快捷按钮在后（订单管理、对账与账单、数据统计共用）
	用法：<date-range-quick v-model="dates" :quicks="QUICKS" @change="search" />
	- v-model：[moment, moment]，没选是 []
	- quicks：快捷按钮 [{ key, text, range?: () => [moment, moment] }]，默认是 今天/昨天/近 7 天/近 30 天/本月（utils/dateQuick.js）
	  · 有 range 的：点了就把日期填好（触发 input 和 change）；当前日期段正好等于它时，按钮自动高亮
	  · 没有 range 的（数据统计的「近 3 个月」这种由服务端按档位算的）：只触发 quick 事件，高亮由父页面用 activeKey 控制
	- activeKey：父页面指定高亮哪个按钮（空字符串=都不亮）；不传就按日期自动对
	- 事件：input / change(dates)：日期变了（选日期、点快捷、清除）；quick(key)：点了快捷按钮
	- disabledDate：默认不能选今天以后；allowClear：默认可清除；maxDays：选的日期段超过天数就提示并拒绝 -->
<template>
	<span class="drq">
		<a-range-picker :value="value" :locale="pickerLocale" :disabledDate="disabledDate || defaultDisabled" :allowClear="allowClear" format="YYYY-MM-DD" :placeholder="placeholder" :style="{ width: pickerWidth + 'px' }" @change="onPick" />
		<a-radio-group :value="currentKey" button-style="solid" @change="onQuick">
			<a-radio-button v-for="q in quicks" :key="q.key" :value="q.key">{{ q.text }}</a-radio-button>
		</a-radio-group>
	</span>
</template>

<script>
import moment from 'moment'
import 'moment/locale/zh-cn'
import pickerLocale from 'ant-design-vue/lib/date-picker/locale/zh_CN'
import { RECENT_QUICKS } from '@/utils/dateQuick'

export default {
	name: 'DateRangeQuick',
	props: {
		value: { type: Array, default: () => [] },
		quicks: { type: Array, default: () => RECENT_QUICKS },
		activeKey: { type: String, default: null },
		disabledDate: { type: Function, default: null },
		allowClear: { type: Boolean, default: true },
		maxDays: { type: Number, default: 0 },
		pickerWidth: { type: Number, default: 250 },
		placeholder: { type: Array, default: () => ['开始日期', '结束日期'] }
	},
	data() {
		return { pickerLocale }
	},
	computed: {
		// 高亮哪个按钮：父页面指定了就用它的，否则看当前日期段正好是哪个快捷
		currentKey() {
			if (this.activeKey !== null) return this.activeKey || undefined
			if (!this.value || this.value.length !== 2) return undefined
			const hit = this.quicks.find((q) => {
				if (!q.range) return false
				const [a, b] = q.range()
				return this.value[0].isSame(a, 'day') && this.value[1].isSame(b, 'day')
			})
			return hit && hit.key
		}
	},
	created() {
		moment.locale('zh-cn') // 日期选择器里的月份、星期显示中文
	},
	methods: {
		defaultDisabled(current) {
			return !!current && current.isAfter(moment().endOf('day'))
		},
		onPick(dates) {
			if (dates && dates.length === 2 && this.maxDays) {
				const days = dates[1].clone().startOf('day').diff(dates[0].clone().startOf('day'), 'days') + 1
				if (days > this.maxDays) {
					this.$message.warning(`最长可以选 ${this.maxDays} 天，请缩短日期段`)
					this.$emit('input', [])
					return
				}
			}
			this.$emit('input', dates || [])
			this.$emit('change', dates || [])
		},
		onQuick(e) {
			const q = this.quicks.find((x) => x.key === e.target.value)
			if (!q) return
			if (q.range) {
				const dates = q.range()
				this.$emit('input', dates)
				this.$emit('change', dates)
			}
			this.$emit('quick', q.key)
		}
	}
}
</script>

<style scoped>
.drq { display: inline-flex; align-items: center; gap: 8px; margin-right: 12px; vertical-align: middle; }
</style>
