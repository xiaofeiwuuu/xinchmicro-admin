<!--
	柱状图 / 折线图（手写 SVG，不依赖图表库）。type 为 'bar'（默认）或 'line'。
	items: [{ label: '11-04', value: 1234, title: '11 月 4 日', tip: ['收入 ¥12.34', '订单 3'] }]（title、tip 可选，鼠标移上去显示；不给就显示 label 和 format(value)）
	format: 数值怎么显示（纵轴刻度和提示框）；color: 柱子颜色
	宽度跟随容器，横轴标签放不下时自动隔几个显示一个
-->
<template>
	<div ref="box" class="bar-chart" :style="{ height: height + 'px' }">
		<svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel">
			<!-- 横向参考线和纵轴刻度 -->
			<g v-for="t in ticks" :key="'t' + t">
				<line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" />
				<text :x="padL - 8" :y="y(t) + 4" text-anchor="end" class="axis">{{ format(t) }}</text>
			</g>
			<!-- 折线：面积、线、圆点 -->
			<g v-if="type === 'line' && items.length">
				<path :d="areaPath" :fill="color" opacity="0.12" />
				<path :d="linePath" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" />
				<circle v-for="(it, i) in items" :key="'c' + i" :cx="bandX(i) + band / 2" :cy="y(it.value)" :r="hover === i ? 5 : items.length > 40 ? 0 : 3" :fill="hover === i ? color : '#fff'" :stroke="color" stroke-width="2" />
			</g>
			<!-- 柱子 -->
			<rect v-for="(it, i) in type === 'bar' ? items : []" :key="'b' + i"
				:x="bandX(i) + (band - barW) / 2" :y="y(it.value)" :width="barW" :height="Math.max(0, baseY - y(it.value))"
				:fill="color" :opacity="hover === -1 || hover === i ? 1 : 0.45" rx="2" />
			<!-- 横轴标签 -->
			<text v-for="(it, i) in items" v-show="i % labelEvery === 0" :key="'l' + i"
				:x="bandX(i) + band / 2" :y="height - 8" text-anchor="middle" class="axis">{{ it.label }}</text>
			<!-- 鼠标感应区：整根柱子的高度范围都能触发 -->
			<rect v-for="(it, i) in items" :key="'h' + i" :x="bandX(i)" :y="padT" :width="band" :height="baseY - padT"
				fill="transparent" @mouseenter="hover = i" @mouseleave="hover = -1" />
			<text v-if="empty" :x="width / 2" :y="(padT + baseY) / 2" text-anchor="middle" class="axis">这段时间没有数据</text>
		</svg>
		<div v-if="hover >= 0 && items[hover]" class="tip" :style="tipStyle">
			<div class="tip-title">{{ items[hover].title || items[hover].label }}</div>
			<div v-for="(line, k) in tipLines" :key="k">{{ line }}</div>
		</div>
	</div>
</template>

<script>
// 刻度取整：让最大刻度是 1 / 2 / 2.5 / 5 / 10 乘以 10 的幂，分成 4 格
function niceMax(max) {
	if (!(max > 0)) return 4
	const rough = max / 4
	const pow = Math.pow(10, Math.floor(Math.log10(rough)))
	const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)
	return step * 4
}

export default {
	name: 'TrendChart',
	props: {
		items: { type: Array, default: () => [] },
		format: { type: Function, default: (v) => String(v) },
		color: { type: String, default: '#1890ff' },
		height: { type: Number, default: 260 },
		ariaLabel: { type: String, default: '图表' },
		type: { type: String, default: 'bar' }
	},
	data() {
		return { width: 0, hover: -1, padL: 64, padR: 12, padT: 12, padB: 30 }
	},
	computed: {
		baseY() { return this.height - this.padB },
		max() { return niceMax(Math.max(0, ...this.items.map((i) => i.value))) },
		ticks() { return [0, 1, 2, 3, 4].map((k) => (this.max / 4) * k) },
		empty() { return !this.items.some((i) => i.value > 0) },
		band() { return this.items.length ? (this.width - this.padL - this.padR) / this.items.length : 0 },
		barW() { return Math.max(2, Math.min(this.band * 0.62, 40)) },
		// 每隔几个显示一个横轴标签：一个标签大约要 46px
		labelEvery() { return Math.max(1, Math.ceil(46 / Math.max(this.band, 1))) },
		linePoints() { return this.items.map((it, i) => [this.bandX(i) + this.band / 2, this.y(it.value)]) },
		linePath() { return this.linePoints.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ') },
		areaPath() {
			const pts = this.linePoints
			if (!pts.length) return ''
			return this.linePath + ` L${pts[pts.length - 1][0].toFixed(1)} ${this.baseY} L${pts[0][0].toFixed(1)} ${this.baseY} Z`
		},
		tipLines() {
			const it = this.items[this.hover]
			return it ? (it.tip && it.tip.length ? it.tip : [this.format(it.value)]) : []
		},
		// 提示框跟着柱子走，靠近右边时放到柱子左边，免得超出
		tipStyle() {
			const cx = this.padL + (this.hover + 0.5) * this.band
			return cx > this.width * 0.6 ? { right: this.width - cx + 12 + 'px', top: '8px' } : { left: cx + 12 + 'px', top: '8px' }
		}
	},
	mounted() {
		this.measure()
		if (typeof ResizeObserver !== 'undefined') {
			this.ro = new ResizeObserver(this.measure)
			this.ro.observe(this.$refs.box)
		} else window.addEventListener('resize', this.measure)
	},
	beforeDestroy() {
		if (this.ro) this.ro.disconnect()
		window.removeEventListener('resize', this.measure)
	},
	methods: {
		measure() { this.width = this.$refs.box ? Math.floor(this.$refs.box.clientWidth) : 0 },
		bandX(i) { return this.padL + i * this.band },
		y(v) { return this.baseY - (v / this.max) * (this.baseY - this.padT) }
	}
}
</script>

<style scoped>
.bar-chart { position: relative; width: 100%; }
.grid { stroke: #f0f0f0; stroke-width: 1; }
.axis { fill: #8c8c8c; font-size: 12px; }
.tip { position: absolute; z-index: 2; background: rgba(0, 0, 0, 0.78); color: #fff; font-size: 12px; line-height: 20px; padding: 6px 10px; border-radius: 4px; pointer-events: none; white-space: nowrap; }
.tip-title { font-weight: 600; }
</style>
