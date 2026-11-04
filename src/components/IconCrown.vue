<!-- 皇冠图标（排行榜前三名用：金、银、铜）。rank 为 1 / 2 / 3，其它数字不要用这个组件。
	圆润的三尖皇冠 + 尖端宝珠 + 底圈 + 中间宝石，垂直渐变上色，深一点的描边让它在白底上也清楚 -->
<template>
	<svg :width="size" :height="size" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="'第 ' + rank + ' 名'">
		<defs>
			<linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" :stop-color="c.top" />
				<stop offset="1" :stop-color="c.bottom" />
			</linearGradient>
		</defs>
		<g :fill="'url(#' + gid + ')'" :stroke="c.stroke" stroke-width="1.1" stroke-linejoin="round">
			<!-- 皇冠主体 -->
			<path d="M4.2 18 L2.6 8.4 Q2.4 7.4 3.3 7.9 L8 11.2 L11.2 5.6 Q12 4.4 12.8 5.6 L16 11.2 L20.7 7.9 Q21.6 7.4 21.4 8.4 L19.8 18 Z" />
			<!-- 底圈 -->
			<rect x="4" y="18.8" width="16" height="2.6" rx="1.3" />
			<!-- 三个尖端的宝珠 -->
			<circle cx="2.7" cy="7.2" r="1.5" stroke-width="1" />
			<circle cx="12" cy="4.1" r="1.7" stroke-width="1" />
			<circle cx="21.3" cy="7.2" r="1.5" stroke-width="1" />
		</g>
		<!-- 中间的宝石 -->
		<circle cx="12" cy="14.4" r="1.5" :fill="c.gem" :stroke="c.stroke" stroke-width="0.8" />
	</svg>
</template>

<script>
// 金、银、铜：渐变上下两端 + 描边 + 宝石颜色
const COLORS = {
	1: { top: '#ffe58f', bottom: '#faad14', stroke: '#c98a0a', gem: '#fff3c4' },
	2: { top: '#f7f9fb', bottom: '#b3bcc9', stroke: '#7f8a9a', gem: '#ffffff' },
	3: { top: '#f6cfa6', bottom: '#c47a35', stroke: '#8f5420', gem: '#ffe3c8' }
}
let seq = 0 // 渐变 id 要在页面里唯一：同页有好几个皇冠，各自用自己的 id，不依赖别的皇冠的定义

export default {
	name: 'IconCrown',
	props: { rank: { type: Number, required: true }, size: { type: Number, default: 24 } },
	data() {
		return { gid: 'crown-grad-' + ++seq }
	},
	computed: {
		c() { return COLORS[this.rank] || COLORS[3] }
	}
}
</script>
